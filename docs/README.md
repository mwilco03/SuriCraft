# SuriCraft

A single-page tool that takes an inventory of OT/ICS assets plus a documented data-flow diagram and produces a curated Suricata ruleset shaped for [Malcolm](https://github.com/idaholab/Malcolm).

## What it does

1. **Inventory** assets (name, IP, type).
2. **Roles per protocol**: tag each asset with one or more `(role, protocol)` pairs (engineering ws, HMI, IO server, ICCP gateway, PLC peer, target server, target PLC, target RTU, etc.).
3. **Data flows**: document expected `from -> to` edges per protocol.
4. **Detections**: pick from a curated catalog of write/program/lifecycle/recon/diag detections per protocol. Every detection ships with a comment explaining the threat model.
5. **Review**: shows the generated rule text plus any documented edges that would alert on legitimate traffic.
6. **Export**: download a Malcolm-shaped bundle as a single zip or as individual files.

## Who it is for

ICS/OT defenders running Malcolm (or Malcolm + Hedgehog sensors) who need to author site-specific Suricata rules and cannot rely on a generic public ruleset.

## What it is not

- A PCAP analyzer.
- A Zeek or Snort generator (Suricata only in v1; emitter dispatch is in place for future versions).
- A live-validation tool. Rules are syntactically generated; you still want to run `suricata -T` and watch for false positives in production.

## Stack

- React 18 + Babel-standalone + JSZip from cdnjs (no build step).
- Plain JSON catalog at `catalog/default-detections.json`.
- Static hosting (GitHub Pages from `main`).

## Live URL

Once you fork and enable Pages: `https://<your-user>.github.io/SuriCraft/`.

## Quick start (local)

```sh
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## Files

| Path | Purpose |
|---|---|
| `index.html` | entry point; loads vendor libs + each module in dependency order |
| `src/state.js` | localStorage save/load |
| `src/catalog-loader.js` | fetches and validates the JSON catalog |
| `src/rule-engine/address-groups.js` | role+protocol -> IP-list expressions for src/dst |
| `src/rule-engine/coverage-gaps.js` | what the ruleset cannot cover (S7CommPlus, PROFINET, etc.) |
| `src/rule-engine/edge-validator.js` | flag rules that will alert on documented flows |
| `src/rule-engine/emitters/suricata.js` | per-protocol Suricata renderers |
| `src/rule-engine/emitters/zeek.js` | stub (v2) |
| `src/rule-engine/emitters/snort.js` | stub (v2) |
| `src/bundle/malcolm.js` | builds the seven-file Malcolm bundle |
| `src/bundle/zip.js` | JSZip wrapper |
| `src/ui/*.js` | React step components |
| `src/app.js` | top-level App |
| `catalog/default-detections.json` | the single source of truth for protocols, roles, severities, stubs, detections |
| `styles/app.css` | extracted styles |
