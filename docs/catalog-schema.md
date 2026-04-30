# Catalog schema

`catalog/default-detections.json` is the single source of truth. The application loads it at page start and builds every UI choice and every emitted rule from it. Editing this file is how you add a new detection.

## Top-level shape

```json
{
  "version": 1,
  "protocols": { "<key>": { "label": "...", "port": 502, "sidBase": 9500000, "parser": "native|byte|none" } },
  "roles":     { "<key>": { "label": "...", "pill": "css-class-suffix" } },
  "severities":{ "<key>": { "classtype": "attempted-admin" } },
  "stubs":     { "<key>": { "label": "...", "port": 0, "transport": "tcp|udp|both", "note": "..." } },
  "detections":[ { ... } ]
}
```

## Detection shape

```json
{
  "id": "modbus_w_5",
  "protocol": "modbus",
  "opclass": "write|program|lifecycle|recon|diag",
  "func": 5,
  "decFunc": 5,
  "title": "Modbus write_single_coil (FC5) from non-HMI source",
  "allowedRoles": ["allowed_hmi", "allowed_eng"],
  "targetRoles":  ["target_modbus_server"],
  "severity": "decode|admin|dos|recon|policy",
  "critical": false,
  "enabledByDefault": true,
  "comment": ["line 1", "line 2"]
}
```

Notes:

- `func` is the protocol-native function/service code as a **decimal integer**. JSON does not support hex literals; `0x4D` becomes `77`.
- `decFunc` is required for CIP (`enip`) because the Suricata `cip_service:` keyword takes decimal. For other protocols `decFunc` is optional.
- `title`, when emitted, has the `Modbus`/`DNP3`/`CIP`/`S7Comm`/`GE-SRTP` prefix stripped to keep `msg:` strings tight.
- `comment` is an ordered list of strings. The first line is shown as the meta caption in the picker; the full list lands above the rule in the exported `.rules` file.
- `enabledByDefault: false` means the detection is in the catalog but unchecked at first run. Use this for high-noise rules (e.g. read-tag) that you only want to surface, not auto-enable.

## SID ranges (reserved)

| Protocol | sidBase | Range |
|---|---|---|
| `modbus` | 9500000 | 9500001 - 9519999 |
| `dnp3`   | 9520000 | 9520001 - 9539999 |
| `enip`   | 9540000 | 9540001 - 9559999 |
| `s7comm` | 9560000 | 9560001 - 9569999 |
| `s7plus` | 9570000 | (reserved; no rules in v1) |
| `srtp`   | 9580000 | 9580001 - 9599999 |

If you add a new protocol, pick a fresh `sidBase` outside any existing range.

## Adding a new detection

1. Open `catalog/default-detections.json`.
2. Pick a unique `id` (convention: `<proto>_<opclass>_<funchex>`).
3. Set `protocol`, `opclass`, `func` (decimal), `decFunc` if CIP.
4. Decide `allowedRoles` (sources the detection should NOT alert on) and `targetRoles` (assets the detection applies to).
5. Pick `severity` and `critical` (critical bypasses dedup in the threshold file).
6. Write a multi-line `comment` explaining the threat model. Future you, six months from now, needs to read this and understand why the rule exists.
7. Save and refresh the SPA. No code change needed.

## Adding a new protocol stub

Stubs are protocols Suricata cannot parse usefully today (or that we have not implemented yet). Adding a stub:

1. Add an entry under `stubs` with `label`, `port`, `transport`, and a one-line `note`.
2. The role-tagging UI will offer the new protocol with a `(no rules)` suffix so users can document its presence.
3. Coverage gaps will pick it up automatically: any asset tagged with the stub triggers a gap entry quoting the `note`.

## Adding a new emitter

Stubbed in v1 (Zeek, Snort) at `src/rule-engine/emitters/<name>.js`. The dispatch table in `src/rule-engine/emitters/suricata.js` is the place to wire a new emitter into.
