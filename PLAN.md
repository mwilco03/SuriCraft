## Recommendation on code structure

**Pick: `index.html` + separate JS modules, no build step.**

Reasoning. Single inline file made sense for the Acme prototype because it lived in one chat artifact. For a public GitHub repo it stops making sense around 1500 lines, which the v3 SPA already crossed. Three concrete reasons to split:

1. **Diffability.** A change to the SRTP renderer should not show up as a 1700-line file diff. Reviewers and forkers need to see what actually changed.
2. **Discoverability.** Someone forking to add a Zeek emitter should land in `src/emitters/zeek.js`, not page 23 of `index.html`. The file structure itself documents the architecture.
3. **No new tooling cost.** ES modules work natively in browsers via `<script type="module">`. No bundler, no npm, no build step. The "no-build" property of option 1 is fully preserved.

The Vite path produces a smaller bundle but introduces a build step, a `node_modules`, a GitHub Action to maintain, and a barrier for non-JS-fluent OT engineers who want to fork. The bundle savings are not worth that.

I will use ES modules with one caveat: the JSX needs to be compiled. I will use Babel-standalone the same way as v3, which works with module scripts via `<script type="text/babel" data-type="module">`. This keeps the no-build property intact.

## Locking in the rest of your answers

| Question | Answer | Implication |
|---|---|---|
| Code structure | index.html + ES modules (recommended) | Multi-file repo, no build |
| Catalog | JSON fetched at load | `catalog/default-detections.json` is the single source of truth |
| Bundle | zip + individual, user picks | JSZip dependency, two export buttons |
| Engines | Suricata only in v1; Zeek and Snort later | Renderer dispatch keyed by emitter, but only suricata implemented |

License and example: I will assume **MIT** and **sanitized example** unless you say otherwise; you can change either before I publish. MIT because it is the lowest-friction choice for OT tooling and matches how Malcolm itself is licensed (BSD-3, similarly permissive). Sanitized example because Acme is a fictional reference network anyway, but renumbering IPs makes it portable and signals to forkers "edit this for your site."

## Research Malcolm paths before I write anything

The v3 SPA emits Security Onion paths. Malcolm uses a different layout. I need to verify against current docs.Research conclusive. Malcolm's actual layout differs from Security Onion's in several specific ways that change what the bundle needs to look like:

| Concern | Malcolm path / mechanism | Source |
|---|---|---|
| Custom Suricata rules | `./suricata/rules/` subdirectory in the Malcolm installation directory; *.rules files placed there are picked up immediately for subsequent PCAP upload, and for live analysis applied by restarting Malcolm | Malcolm docs |
| Custom Suricata YAML overlays | `./suricata/include-configs/` subdirectory; when Malcolm creates the suricata.yaml file these additional files will be added at the end in an include section | Malcolm docs |
| Live-suricata reload command | `docker compose exec suricata /usr/local/bin/docker_entrypoint.sh true`, `docker compose exec suricata-live /usr/local/bin/docker_entrypoint.sh true`, `docker compose exec suricata-live supervisorctl restart live-suricata` | Malcolm docs |
| Bypass default ruleset | SURICATA_CUSTOM_RULES_ONLY: if set to true, Malcolm will bypass the default Suricata ruleset and use only user-defined rules | Malcolm docs |
| Custom Zeek scripts | `./zeek/custom/` subdirectory; users will need to create a `__load__.zeek` file there to tell Zeek what to load from that directory | Malcolm docs |
| Built-in OT/ICS rules toggle | SURICATA_DISABLE_ICS_ALL: if set to true, this variable can be used to disable Malcolm's built-in Suricata rules for Operational Technology/Industrial Control Systems (OT/ICS) vulnerabilities and exploits | Malcolm docs |
| Hedgehog sensor (separate path) | on Hedgehog Linux, the Suricata custom rules directory is `/opt/sensor/sensor_ctl/suricata/rules/`, and the SURICATA_CUSTOM_RULES_ONLY environment variable can be found in `/opt/sensor/sensor_ctl/control_vars.conf` | OT SOC tuning article |

This changes the bundle layout from what the Acme v3 SPA produces. Final plan:

## 13. Concrete repo layout (final)

```
ot-rule-authoring/
├── index.html                            # entry point, ~100 lines, loads modules
├── src/
│   ├── app.js                            # React App component, step dispatch
│   ├── state.js                          # localStorage load/save, default state
│   ├── catalog-loader.js                 # fetch default-detections.json + custom override
│   ├── rule-engine/
│   │   ├── address-groups.js             # build src/dst expressions from roles
│   │   ├── coverage-gaps.js              # detect S7CommPlus/PROFINET/etc gaps
│   │   ├── edge-validator.js             # documented flows vs generated rules
│   │   └── emitters/
│   │       ├── suricata.js               # protocol-keyed renderers (the v3 logic)
│   │       ├── zeek.js                   # stub for v2, throws "not implemented"
│   │       └── snort.js                  # stub for v2, throws "not implemented"
│   ├── bundle/
│   │   ├── malcolm.js                    # Malcolm-shaped paths and README
│   │   └── zip.js                        # JSZip wrapper, single-zip export
│   └── ui/
│       ├── stepper.js
│       ├── step-inventory.js
│       ├── step-roles.js
│       ├── step-flows.js
│       ├── step-detections.js
│       ├── step-review.js
│       └── step-export.js
├── catalog/
│   └── default-detections.json           # 33-entry catalog, the single source of truth
├── examples/
│   └── reference-network.json            # sanitized reference asset model
├── docs/
│   ├── README.md                         # project overview + quick start
│   ├── deploying-on-github-pages.md      # how to fork and publish
│   ├── catalog-schema.md                 # how to add/edit detections
│   ├── malcolm-integration.md            # how the bundle drops into Malcolm
│   └── known-limitations.md              # honest list of what this does not do
├── styles/
│   └── app.css                           # extracted from inline <style>
├── .nojekyll                             # disable Jekyll
├── LICENSE                               # MIT
└── README.md                             # repo landing, brief
```

Total: roughly 25 files. Each file has a single responsibility, none is over 400 lines.

## 14. Bundle contents (Malcolm-shaped)

For each export, the user gets:

| File | Path on Malcolm | Purpose |
|---|---|---|
| `custom-ics.rules` | `./suricata/rules/custom-ics.rules` | The generated rules |
| `custom-ics-include.yaml` | `./suricata/include-configs/custom-ics-include.yaml` | stream-depth: 0, threshold-file path, address-groups |
| `threshold.config` | overlay, referenced from include yaml | event_filter dedup for non-critical writes |
| `coverage-gaps.md` | side document | Honest list of what is not covered |
| `edge-findings.md` | side document | Documented flows vs generated rules |
| `asset-model.json` | side document | Round-trip back into the SPA |
| `README.md` | side document | The exact deploy commands |

Suricata variables (address groups by role+protocol) go into the include yaml, not into a separate Salt pillar.

The README includes the exact verified Malcolm commands:

```sh
# from the Malcolm installation directory
cp custom-ics.rules ./suricata/rules/
cp custom-ics-include.yaml ./suricata/include-configs/
cp threshold.config ./suricata/include-configs/

# trigger config regeneration and reload
docker compose exec suricata /usr/local/bin/docker_entrypoint.sh true
docker compose exec suricata-live /usr/local/bin/docker_entrypoint.sh true
docker compose exec suricata-live supervisorctl restart live-suricata
```

The README also includes the alternate Hedgehog-sensor path for users running the sensor separately from the Malcolm aggregator.

## 15. Catalog JSON schema (excerpt)

```json
{
  "version": 1,
  "protocols": {
    "modbus": { "label": "Modbus / TCP", "port": 502, "sidBase": 9500000, "parser": "native" },
    "dnp3":   { "label": "DNP3",         "port": 20000, "sidBase": 9520000, "parser": "native" },
    "enip":   { "label": "EtherNet/IP + CIP", "port": 44818, "sidBase": 9540000, "parser": "native" },
    "s7comm": { "label": "S7Comm classic (S7-300/400)", "port": 102, "sidBase": 9560000, "parser": "byte" },
    "s7plus": { "label": "S7CommPlus (S7-1200/1500)",   "port": 102, "sidBase": 9570000, "parser": "none" },
    "srtp":   { "label": "GE-SRTP",      "port": 18245, "sidBase": 9580000, "parser": "byte" }
  },
  "roles": { ... },
  "severities": { ... },
  "detections": [
    {
      "id": "modbus_w_5",
      "protocol": "modbus",
      "opclass": "write",
      "func": 5,
      "title": "Modbus write_single_coil (FC5) from non-HMI source",
      "allowedRoles": ["allowed_hmi", "allowed_eng"],
      "targetRoles":  ["target_modbus_server"],
      "severity": "admin",
      "critical": false,
      "enabledByDefault": true,
      "comment": ["...", "..."]
    },
    ...
  ]
}
```

Documented in `docs/catalog-schema.md` so a contributor can add a new detection by editing JSON, no code change.

## 16. Step-by-step build order

1. Create the repo skeleton with all directories and empty files.
2. Write `catalog/default-detections.json` (33 entries) and the schema doc.
3. Port `src/state.js`, `src/rule-engine/address-groups.js`, `src/rule-engine/edge-validator.js`, `src/rule-engine/coverage-gaps.js` from the v3 SPA.
4. Write `src/rule-engine/emitters/suricata.js` with the Modbus/DNP3/CIP/S7Comm/SRTP renderers.
5. Stub Zeek and Snort emitters with `throw new Error("v1 emits suricata only")`.
6. Write `src/bundle/malcolm.js` producing the seven artifacts listed above.
7. Write `src/bundle/zip.js` wrapping JSZip from cdnjs.
8. Port the six step components into `src/ui/`.
9. Write `src/app.js` and `index.html` to wire it all together.
10. Extract CSS into `styles/app.css`.
11. Write the four `docs/*.md` files.
12. Write `examples/reference-network.json` (sanitized Acme).
13. Add `.nojekyll`, `LICENSE` (MIT), top-level `README.md`.
14. Smoke-test by serving the directory locally with `python3 -m http.server` and clicking through.

## 17. Publishing to GitHub Pages (the user side)

A one-page guide in `docs/deploying-on-github-pages.md`:

```sh
# 1. fork or create the repo
gh repo create ot-rule-authoring --public --source=. --remote=origin --push

# or if you cloned this from somewhere
git remote set-url origin git@github.com:<you>/ot-rule-authoring.git
git push -u origin main

# 2. enable Pages in repo settings
#    Settings -> Pages -> Source: "Deploy from a branch"
#    Branch: main / (root)
#    Save

# 3. wait ~30 seconds, site is live at
#    https://<you>.github.io/ot-rule-authoring/
```

That is the entire publish flow. No Action, no token, no secret to configure.

## 18. Output of this turn (when you say go)

I will produce a single zip you can download, extract, push, and publish. The deliverable is:

- The directory tree above, fully populated.
- Working SPA, validated by simulating rule generation against the example asset model.
- A short markdown deployment guide (`PUBLISH-ME.md` at the top level) summarizing the four shell commands above.

I will not produce any of this until you confirm the build order above is what you want, because writing 25 files and then iterating is more expensive than confirming first.

## 19. What I am NOT going to do

- I am not going to bundle the JS via Vite. The recommendation stands; ES modules in the browser are sufficient.
- I am not going to add a GitHub Action. Pages from `main` is enough.
- I am not going to implement Zeek or Snort emitters in v1. Stubs only. Adding them is a future PR.
- I am not going to add live PCAP validation. Out of scope.
- I am not going to invent Malcolm command paths. The four commands above are pulled from the cited Malcolm docs, not from memory.


Got it. Plan only, written for an executing agent. No documents, no preamble, no verification asides.

---

# PLAN: Build OT Rule Authoring SPA for GitHub Pages

## Inputs the executor needs

- The current `/mnt/user-data/outputs/ot_rule_authoring.html` (v3 SPA) as the source of truth for: rule renderers, validators, role model, edge model, demo asset structure, default detection comments. Read it first, do not rewrite logic from scratch.
- The decisions locked in this thread:
  - Multi-file ES module structure, no build step
  - Catalog as JSON, fetched at page load
  - Both zip and individual file downloads
  - Suricata emitter only in v1; Zeek and Snort stubbed
  - All eight catalog additions (CIP `0x4C` Read Tag, `0x4B` Execute PCCC, `0x55` Get Instance Attributes List, `0x52` Read Tag Fragmented, `0x53` Write Tag Fragmented, `0x56` Write Tag Fragmented (this is the 0x56 from the source doc; check before adding, see verification step below), Modbus `0x17` Read/Write Multiple Registers, S7Comm `0x04` Read Var)
  - Five protocol stubs: IEC 60870-5-104, IEC 61850 MMS, BACnet, OPC UA, HART-IP
  - Bundle targets Malcolm paths
  - MIT license
  - Sanitized reference network as importable example
  - No GitHub Action

## Verification before writing the catalog

CIP service codes need one final check. The earlier turn confirmed `0x4C, 0x4D, 0x4E, 0x52, 0x53, 0x55, 0x4B, 0x0A` from Rockwell 1756-PM020. The doc-derived "`0x56` Write Tag Fragmented" is wrong: `0x53` is Write Tag Fragmented, `0x56` is not in the verified list. Drop `0x56`. Modbus `0x17` and S7Comm `0x04` are confirmed standard.

So actual catalog additions are seven, not eight:
- CIP `0x4C` Read Tag (recon)
- CIP `0x4B` Execute PCCC (legacy bridge, recon)
- CIP `0x55` Get Instance Attributes List (recon)
- CIP `0x52` Read Tag Fragmented (recon)
- CIP `0x53` Write Tag Fragmented (write, critical-on-non-eng)
- Modbus `0x17` Read/Write Multiple Registers (write)
- S7Comm `0x04` Read Var (recon, off by default)

## Repo structure to produce

```
ot-rule-authoring/
├── index.html
├── src/
│   ├── app.js
│   ├── state.js
│   ├── catalog-loader.js
│   ├── rule-engine/
│   │   ├── address-groups.js
│   │   ├── coverage-gaps.js
│   │   ├── edge-validator.js
│   │   └── emitters/
│   │       ├── suricata.js
│   │       ├── zeek.js              (stub: throw)
│   │       └── snort.js             (stub: throw)
│   ├── bundle/
│   │   ├── malcolm.js
│   │   └── zip.js
│   └── ui/
│       ├── stepper.js
│       ├── step-inventory.js
│       ├── step-roles.js
│       ├── step-flows.js
│       ├── step-detections.js
│       ├── step-review.js
│       └── step-export.js
├── catalog/
│   └── default-detections.json
├── examples/
│   └── reference-network.json
├── docs/
│   ├── README.md
│   ├── deploying-on-github-pages.md
│   ├── catalog-schema.md
│   ├── malcolm-integration.md
│   └── known-limitations.md
├── styles/
│   └── app.css
├── .nojekyll
├── LICENSE                          (MIT, 2026, no person named)
└── README.md
```

## Operations in order

### 1. Lift logic from v3 SPA into modules

Source the following symbols from `ot_rule_authoring.html` and split into modules. Preserve behavior. Do not change semantics.

| Symbol in v3 | Move to |
|---|---|
| `STORAGE_KEY`, `DEFAULT_STATE`, `loadState`, `saveState` | `src/state.js` |
| `ipsForRoleProtocol`, `buildSrcExpression`, `buildDstExpression` | `src/rule-engine/address-groups.js` |
| `validateEdgesAgainstRules` | `src/rule-engine/edge-validator.js` |
| `computeCoverageGaps` | `src/rule-engine/coverage-gaps.js` |
| `commonOptions`, `renderModbus`, `renderDnp3`, `renderEnip`, `renderS7classic`, `renderSrtp`, `RENDERERS`, `generateRules` | `src/rule-engine/emitters/suricata.js` |
| `generateBundle` | `src/bundle/malcolm.js` (rewrite paths, see step 5) |
| `downloadFile` | `src/bundle/zip.js` |
| Each `Step*` component | `src/ui/step-*.js`, one per file |
| `Stepper`, `NavButtons` | `src/ui/stepper.js` |
| `App` | `src/app.js` |
| Inline `<style>` | `styles/app.css` |

### 2. Replace inline constants with JSON-driven catalog

Remove `PROTOCOLS`, `ROLES`, `SEVERITY`, `DETECTIONS`, `DEMO_ASSETS`, `DEMO_EDGES` from JS. They become `catalog/default-detections.json` plus `examples/reference-network.json`.

`src/catalog-loader.js` exports a single async `loadCatalog()` that:
1. Fetches `./catalog/default-detections.json`
2. Validates required top-level keys: `version`, `protocols`, `roles`, `severities`, `detections`
3. Returns the parsed object
4. On parse failure throws with the file name and line number; UI catches and shows a banner

### 3. Write `catalog/default-detections.json`

Schema:
```
{
  "version": 1,
  "protocols": { <key>: { label, port, sidBase, parser } },
  "roles":     { <key>: { label, pill } },
  "severities":{ <key>: { classtype } },
  "stubs":     { <key>: { label, port, transport, note } },
  "detections":[ { id, protocol, opclass, func, decFunc?, title, allowedRoles, targetRoles, severity, critical, enabledByDefault, comment[] } ]
}
```

Populate with the v3 33 detections plus the seven verified additions above. Add the five stub entries under `stubs`:

| key | label | port | transport | note |
|---|---|---|---|---|
| iec104 | IEC 60870-5-104 | 2404 | tcp | Suricata has a parser; rules deferred to v2 |
| iec61850-mms | IEC 61850 MMS | 102 | tcp | shares port 102 with S7Comm; no Suricata parser |
| bacnet | BACnet/IP | 47808 | udp | no Suricata parser |
| opcua | OPC UA Binary | 4840 | tcp | Suricata has a dissector since 6.0; rules deferred |
| hart-ip | HART-IP | 5094 | both | niche; flag if asset claims this role |

Stubs do not generate rules. They appear in role-tagging and trigger coverage-gap entries when assets carry them.

### 4. Update `coverage-gaps.js` to handle stubs

Add: for each stub protocol with at least one asset role using it, emit a coverage-gap entry derived from the stub's `note` field. Drop the hardcoded gap text for those protocols if any exists.

### 5. Rewrite `bundle/malcolm.js` for verified Malcolm paths

Replace the v3 Security-Onion-shaped output. Produce these files:

| Output file | Documented Malcolm target path |
|---|---|
| `custom-ics.rules` | `./suricata/rules/custom-ics.rules` |
| `custom-ics-include.yaml` | `./suricata/include-configs/custom-ics-include.yaml` |
| `threshold.config` | referenced from include yaml as `threshold-file:` |
| `coverage-gaps.md` | side document |
| `edge-findings.md` | side document, only when findings exist |
| `asset-model.json` | side document |
| `README.md` | side document with the Malcolm reload commands |

`custom-ics-include.yaml` content shape: `stream.reassembly.depth: 0`, `vars.address-groups: <generated>`, `threshold-file: /var/lib/suricata/include-configs/threshold.config`. The README inside the bundle gives the four `cp` commands and the three `docker compose exec` reload commands from the verified Malcolm docs.

Drop the `bundleTargetPath` map from v3; replace with a Malcolm-specific map.

### 6. Add zip export

`src/bundle/zip.js`:
- Loads JSZip from `https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js` via a `<script>` tag in `index.html`
- Exposes `downloadZip(bundle, filename)` that builds a single zip containing every file from the bundle dictionary
- Exposes `downloadFile(name, content)` (the existing v3 implementation)

`step-export.js` gets two buttons in the action row: "download all (zip)" and "download all (individual files)". Existing per-file download buttons stay.

### 7. Stub Zeek and Snort emitters

`src/rule-engine/emitters/zeek.js` and `snort.js`: each exports a `render(detection, ...)` function that throws `Error("emitter not implemented in v1")`. Wire them into a `EMITTERS` map keyed by emitter name. v1 only invokes `EMITTERS.suricata`. The map exists so the v2 PR is a one-line dispatch change.

### 8. Update UI to support stubs and emitter selection

`step-inventory.js`: no change beyond catalog-driven role list.

`step-roles.js`: protocol dropdown now also lists stub protocols (clearly marked in the label, e.g. "BACnet (no rules)"). Asset can carry stub roles. Detection step ignores stubs.

`step-detections.js`: protocol sections derive from `catalog.protocols`, not hardcoded list.

`step-export.js`: add a hidden-by-default emitter selector showing only "suricata" in v1. Future-proofs the UI for v2 without exposing dead options now.

### 9. Write `index.html`

- Loads React, ReactDOM, Babel-standalone from cdnjs (UMD, same as v3)
- Loads JSZip from cdnjs
- Imports `styles/app.css`
- Single `<script type="text/babel" data-presets="env,react" data-type="module" src="src/app.js"></script>`
- Mount point `<div id="root"></div>`

### 10. Strip Acme demo data, replace with sanitized example

Build `examples/reference-network.json` containing the v3 17 assets and 13 edges, but renumbered:

| Original | Replace with |
|---|---|
| 192.168.0.x | 10.20.0.x |
| 192.168.1.x | 10.20.1.x |
| 192.168.32.x | 10.20.32.x |
| 10.5.5.x | 172.30.5.x |
| 10.15.15.x | 172.30.15.x |
| Asset names containing "Acme", "ACS", "ACD", "ASC", "AP&L" | Generic equivalents: "Site-A", "Site-B", "Site-C", "Substation" |
| "Indusoft" | "HMI Vendor A" |
| "RSView32" | "HMI Vendor B" |
| "SIXnet" | "RTU Vendor X" |

Keep PLC family identifiers (S7-1515, S7-315, S7-1200, CPE330, L81E, L55) since those are real product names whose detection-relevance the example is meant to teach.

The "load demo" buttons in step-inventory and step-flows fetch this file via `fetch('./examples/reference-network.json')` and import it.

### 11. CSS extraction

Move all v3 inline styles to `styles/app.css`. No semantic changes. Preserve the dark-mode media query block.

### 12. Top-level `README.md` and `LICENSE`

`README.md`: brief, points to `docs/README.md` for full content. List of tech (React via CDN, no build), one-line "publishes to GitHub Pages from main branch."

`LICENSE`: MIT, copyright 2026 (no individual named, just "the contributors").

### 13. Documentation

Five files in `docs/`. Each is short and operational, not narrative.

- `docs/README.md`: what it is, what it does, who it is for, link to the live SPA.
- `docs/deploying-on-github-pages.md`: the four-command publish flow (clone, push, enable Pages, verify URL).
- `docs/catalog-schema.md`: JSON shape, how to add a detection, where SID ranges are reserved.
- `docs/malcolm-integration.md`: where the bundle files go on Malcolm, the exact reload commands, the Hedgehog-sensor variant.
- `docs/known-limitations.md`: stream-depth requirement, S7CommPlus invisibility, PROFINET L2 invisibility, no PCAP validation, validator does not know sub-ops.

### 14. Smoke test

After building, the executor must:
1. `cd ot-rule-authoring && python3 -m http.server 8000`
2. Open `http://localhost:8000` in a headless browser via Playwright or equivalent
3. Confirm the page renders without JS errors
4. Click through all six steps with the demo loaded
5. Trigger the export and verify the seven bundle files materialize
6. Verify the zip download produces a valid zip with the same seven files

If any step fails, fix and re-test before delivery.

### 15. Delivery

Single zip at `/mnt/user-data/outputs/ot-rule-authoring.zip` containing the entire repo tree. Use `present_files` to surface it.

## What the executor must NOT do

- Do not invent CIP service codes beyond the seven verified additions.
- Do not add Zeek or Snort rule generation logic.
- Do not add a GitHub Action.
- Do not change the v3 rule-rendering byte patterns. They are validated.
- Do not add live PCAP validation.
- Do not introduce a build step or Node dependency.
- Do not use em dashes anywhere in code, comments, or docs.
- Do not hardcode any IP, function code, port, or role string in JS once the catalog is JSON. Read from catalog.

## Acceptance criteria

- Repo tree matches the structure in this plan
- `python3 -m http.server` plus a browser visit produces a working SPA
- "load reference network" button populates 17 assets and 13 edges
- All six steps function
- Export produces seven files matching Malcolm paths
- Zip download contains the same seven files
- No console errors, no em dashes, no Acme strings in any shipped file
- Catalog is the only source of detection definitions; grepping JS for `function code`, hex literals like `0x05`, `0x10`, etc. inside detection logic finds zero matches outside the JSON parsing path

## Open items the executor should escalate, not guess

- If JSZip CDN is unreachable in the build environment, escalate. Do not switch to a different lib.
- If a Malcolm doc URL cited in the README returns 404 at build time, escalate. Do not paraphrase from memory.
- If the Suricata `cip_service` keyword does not exist for one of the new CIP service codes (some Suricata builds gate this behind app-layer enip detection), the executor should verify by attempting a Suricata syntax check (`suricata -T -c suricata.yaml -S generated.rules` if Suricata is installed in the build env). If not available, document the assumption in `docs/known-limitations.md` and proceed.

---

End of plan.
