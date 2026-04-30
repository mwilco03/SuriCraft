# Known limitations

Read this before depending on the output for incident detection.

## Stream reassembly depth

Suricata's default `stream.reassembly.depth: 1mb` causes the Modbus parser (and others) to silently stop inspecting long-lived flows after the first 1 MB of traffic. ICS sessions routinely run for days. The exported `custom-ics-include.yaml` sets `stream.reassembly.depth: 0` to disable the cap. If you handle deployment manually, ensure your `suricata.yaml` does the same; otherwise rules will appear to work for an hour and then go quiet.

## S7CommPlus is invisible

S7-1200/1500 controllers speak S7CommPlus, which encrypts PDU bodies. Suricata cannot inspect contents. The catalog includes `s7plus` only so it shows up in role tagging and triggers a coverage-gap entry. The actual detection has to come from Zeek's `icsnpp-s7comm` plugin.

## PROFINET runs at L2

PROFINET DCP and PROFINET RT use EtherType `0x8892` and stay on layer 2. A Suricata sensor on an L3 SPAN port sees zero PROFINET traffic. If your asset list includes PROFINET I/O modules, run Zeek with `icsnpp-profinet-io-cm` on a TAP that preserves L2.

## GE-SRTP rules are byte-anchored

There is no Suricata application-layer parser for GE-SRTP. The renderer anchors on `dsize:56`, the leading `|02|` byte, and the service code at offset 42. This catches the canonical 56-byte explicit-message form documented by Denton et al. (2017). Fragmented messages, non-standard lengths, and exception responses are not covered.

## CIP cyclic I/O is not covered

Class 1 cyclic I/O messaging on UDP/2222 is the bulk of operational CIP traffic but is not explicit-message-shaped. The exported rules only cover CIP Explicit Messaging on TCP/44818. For cyclic-I/O anomaly detection use Zeek `icsnpp-enip` plus a cadence script.

## Sub-operations are not parsed

Several rules alert on a function code without knowing the sub-function. Examples:

- Modbus FC8 (Diagnostics): the dangerous variant is sub-function 4 (Force Listen Only Mode). Suricata's Modbus parser does not expose sub-functions in keyword form, so the rule alerts on FC8 broadly. Analyst pivots to the payload to confirm.
- DNP3 has objects/variations that the rule does not match on.
- S7Comm has ROSCTR + parameter byte combinations that are not constrained in the rule.

This is why the edge validator says "may trigger" not "will trigger": a documented flow may carry the protocol generally but never carry the specific sub-op.

## No live PCAP validation

The tool generates rule text. It does not run Suricata, does not load a PCAP, and does not test the rule against captured traffic. Run `suricata -T -c suricata.yaml -S custom-ics.rules` (or equivalent on Malcolm) before relying on the output.

## Catalog is not exhaustive

The 33+ detections in `catalog/default-detections.json` are the operationally significant ones for the protocols covered, not every possible function code. Read the catalog and decide what your environment requires; PRs welcome.

## Stub protocols (no Suricata coverage)

The catalog `stubs` block lists protocols where assets are present in OT environments but Suricata coverage is deferred or impossible:

- IEC 60870-5-104 (parser available; rule renderer deferred to v2)
- IEC 61850 MMS (no Suricata parser; cover with Zeek)
- BACnet/IP (no Suricata parser; cover with Zeek)
- OPC UA Binary (parser available since Suricata 6.0; rule renderer deferred to v2)
- HART-IP (niche; no built-in coverage)

If your assets carry these, the role-tagging UI will accept them and the coverage-gap report will surface them. The exported rules will not include them.

## Known browsers

Tested on current Chrome and Firefox. Babel-standalone fetches and compiles JSX in-browser; the first page load is heavier than a typical static site (~1.5 MB of vendor code from cdnjs). Subsequent loads hit the CDN cache.
