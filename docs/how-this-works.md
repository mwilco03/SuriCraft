# How this works

A short walkthrough of the model the SPA is built on. Read this if step 2 ("access per protocol") feels arbitrary or you want to know what a "critical" detection actually does in the output.

## The big picture

For each ICS protocol you care about (Modbus, DNP3, CIP, S7Comm, GE-SRTP), Suricata can match on the protocol's function/service code. The pattern that catches most ICS attacks is:

> "This function code is alarming **unless** it comes from a host we have explicitly allowed."

So every generated rule has the shape:

```
alert tcp ![<allow-list>] any -> [<targets>] <port> ( ... function-code match ... )
```

The allow-list is per detection. Different function codes need different allow-lists:

- `Modbus FC5` (write_single_coil) is routine if it comes from an HMI or engineering workstation. Anything else: alert.
- `Modbus FC8` (diagnostics, can include force-listen-only-mode) is engineering only. HMIs don't legitimately send FC8.
- `DNP3 FC13` (cold restart) has *no* allow-list. Any source: alert. Outside a maintenance window, nobody should be cold-restarting an RTU.

The job of step 2 is to tell the SPA which assets fill which slot in those allow-lists, per protocol.

## Step 2: access per protocol

Per protocol you have on the wire, you fill in lists:

| Slot | What it means |
|---|---|
| **Targets** | The destinations rules apply to. Modbus servers for Modbus rules, Logix PLCs for CIP rules, etc. The rule's `dst` is the union of these IPs. |
| **Operator allow-list** | HMIs, IO servers — sources that legitimately do routine read/write operations. |
| **Engineering allow-list** | Engineering workstations and programming tools — sources that legitimately do programming, diagnostics, configuration. |
| **Peer allow-list** | Other PLCs / I/O servers doing legitimate device-to-device traffic. Only relevant for some protocols (notably CIP). |

Detections in the catalog declare which slots count as "allowed sources" for them. Examples:

- Modbus FC5: `operator + engineering` → an HMI or an engineering workstation can send FC5 without alerting.
- Modbus FC8: `engineering` only → only engineering workstations are allowed; HMIs sending FC8 will alert.
- DNP3 cold-restart: empty → no allow-list, every source produces an alert.

When you check an asset under "Operator allow-list for Modbus," the SPA records that that asset is in the Modbus operator slot. At rule-generation time, every Modbus detection that has `operator` in its allow-list will exclude that asset's IPs from its `src` field.

## Why categories instead of "asset types"

Tools that ship a device taxonomy ("PLC", "HMI", "RTU") imply they understand what those devices speak. They don't, really — protocol assignment depends on how each device was commissioned at your site. A specific Allen-Bradley L81E might speak CIP only, or CIP + Modbus, depending on which modules are installed.

So the SPA never asks "what kind of device is this." It asks "for *this protocol*, what does *this asset* do." Same asset can be in different slots for different protocols — your HMI might be in operator for Modbus and in operator for S7Comm, but absent from CIP.

## Step 3: data flows

Optional but useful. Document `from -> to` edges per protocol — the traffic you *expect* to see on the wire. The SPA cross-checks each generated rule against this flow list and warns you in step 5 if a documented edge will trigger a rule on legitimate traffic. That tells you up front which rules you'll need to tune.

Note the validator only knows about (protocol, source, destination). It does not know what *sub-operation* (function code, service code) an edge actually carries. So a "this edge will trigger this rule" warning is a candidate to review, not a confirmed false positive.

## Step 4: detections

Curated list of operationally significant function/service codes per protocol. For each, the catalog ships:

- A title and 2-3 lines of comment explaining the threat model
- The allow-list slots (operator / engineering / peer / none)
- A `severity` (decode, admin, dos, recon, policy) used in the Suricata `classtype:` field
- A `critical` flag — if true, no dedup is applied to this rule (every event fires)
- An `enabledByDefault` flag

Use the preset toggles to bulk-enable / bulk-disable subsets:

- **defaults** — what the catalog ships as enabled-by-default
- **critical only** — restart, stop, program-replacement, privilege-escalation type detections
- **writes only** — every detection where `opclass` is "write"

Toggle "show orphans" to display detections that won't fire because no asset is currently a target for that protocol. Hidden by default to reduce noise.

## Step 5: review

For each generated rule, you see:

- The full rule text as it will appear in `custom-ics.rules`
- The comment block (editable — your edits land in the exported `.rules` file above each rule)
- Any documented edges (from step 3) that will trigger this rule

If an edge appears, you have three options:

1. **Add the edge's source to the appropriate allow-list in step 2.** Most common: an asset that's actually performing a legitimate role you didn't tag.
2. **Edit the catalog** to broaden the allow-list for that detection (rarely the right answer; usually means the detection's threat model is wrong for your site).
3. **Accept the alert as intended.** The rule will fire on that documented flow; SOC will see it and recognize it.

## Step 6: export

You get six or seven files:

- `custom-ics.rules` — the rules. Drop wherever your Suricata install reads rule files from.
- `custom-ics-include.yaml` — config overlay. `stream.reassembly.depth: 0` is mandatory for Modbus on long-lived flows; the address-groups block exposes your role/protocol IP lists as Suricata variables you can reference in your own rules.
- `threshold.config` — per-SID dedup. Reference from `suricata.yaml` as `threshold-file:`.
- `coverage-gaps.md` — protocols and behaviors not covered. Read this. S7CommPlus is encrypted; PROFINET is L2; etc.
- `edge-findings.md` (only if any) — same content as the inline warnings in step 5, in a format you can paste into a ticket.
- `asset-model.json` — re-import to edit later.
- `README.md` — bundle-specific deploy commands.

## Why byte-rules for some protocols

Suricata has native parsers for Modbus, DNP3, CIP. It does not have one for S7Comm classic or GE-SRTP. For those, the renderer falls back to byte-pattern rules:

- **S7Comm**: anchors on TPKT header `|03 00|` at offset 0, COTP ROSCTR `|32 01|` within 30 bytes, function byte at distance 8.
- **GE-SRTP**: anchors on `dsize:56`, leading `|02|`, service code at offset 42.

Byte rules don't understand the protocol. They cannot:

- Match on sub-functions (the dangerous variant of FC8 is sub-function 4; we can't filter on it)
- Correlate exception/error responses
- Handle fragmented or non-standard message lengths

So a byte-rule on a function code is broader than a parser-aware rule on the same code. The SPA flags this in step 4 with a "byte rules only" pill on the protocol section.

## Why severity / critical / threshold matters

The exported `threshold.config` adds `event_filter` lines that suppress duplicate alerts:

- Detections with `opclass: "write"` or recon: dedup window 5 minutes per source.
- Detections with `opclass: "program"` (program download/upload, file ops): dedup window 1 hour per source.
- Detections with `critical: true` are *not* in the threshold file. Every event fires, every time. These are the page-the-on-call detections: PLC stops, RTU restarts, privilege-elevation logins, program commits.

Every generated rule includes a `metadata:` block:

- `ics_protocol` — the protocol key
- `ics_opclass` — write / program / lifecycle / recon / diag
- `ics_func` — the function/service code (decimal for Modbus/DNP3, `0xNN` string for CIP/S7Comm/SRTP)
- `ics_severity critical` (only when critical)
- `ics_diagram_rev` — the diagram revision string from the SPA. Useful for grepping `eve.json` to confirm your bundle is actually firing.

## Catalog edits

The 40-detection catalog is JSON. To add or modify detections, edit `catalog/default-detections.json` directly. See `docs/catalog-schema.md` for the schema.

The role list itself is currently fixed (12 internal role names mapping to the 4 access categories above). Adding a new category would require a code change — open an issue to discuss.

## Things this tool does not do

- Capture or analyze PCAPs
- Talk to a SIEM (OpenSearch, Splunk, Wazuh)
- Validate rules against a running Suricata
- Discover assets from network traffic
- Run on a server (it's a static page)
- Persist anything beyond your browser's localStorage

If you need any of those, fork the repo and build a companion tool. The SPA is intentionally narrow.
