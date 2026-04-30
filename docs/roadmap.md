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

## Pending

- [ ] **Validate generated rules.** Client-side syntax checker before export. Catch missing `sid`, unbalanced parens, unknown keywords, duplicate SIDs across the bundle. No server, no Suricata install assumed; pure regex/AST level.
- [ ] **Bulk role tagging.** In step 2, multi-select assets and apply a `(role, protocol)` to all of them at once instead of clicking through each asset's dropdowns.
- [ ] **Hide detections without coverable target.** Step 4 currently shows all 40 detections with a "no target asset" warning on orphans. Default to hiding them, with a toggle to show.
- [ ] **Critical-only and writes-only quick filters.** Step 4 preset toggles to enable/disable subsets at once.
- [ ] **Vendor CDN libs for air-gapped use.** React, ReactDOM, Babel, JSZip currently load from cdnjs. Ship them in `vendor/` so the SPA works on air-gapped workstations behind strict egress proxies.
- [ ] **Asset-model diff on import.** When importing an `asset-model.json`, show what changed (added / removed / modified assets, edges, detection toggles) before applying.
- [ ] **Multi-NIC entry helper.** Step 1 toolbar accepts comma-separated IPs but the UX is awkward. Add a dedicated multi-NIC entry mode.
- [ ] **Per-protocol app-layer overlay toggle.** The exported `custom-ics-include.yaml` always enables `modbus / dnp3 / enip` app-layer parsers. Let the user uncheck protocols they don't have on the wire.

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
