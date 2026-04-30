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
