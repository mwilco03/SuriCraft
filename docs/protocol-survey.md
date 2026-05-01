# Protocol survey — additional OT protocols and GE-SRTP forensics

Survey conducted 2026-05-01. Sources: Wireshark master (gitlab/github), CISA ICSNPP project, awesome-industrial-protocols, ICS research papers.

## GE-SRTP forensics

The earlier finding — that mainline Wireshark has no GE-SRTP dissector — stands. But there is significant ecosystem coverage we missed:

| Project | Type | Status |
|---|---|---|
| [Palatis/packet-ge-srtp](https://github.com/Palatis/packet-ge-srtp) | Wireshark Lua dissector (community) | Working, BSD-3, "mostly complete" — no multi-packet responses, no SNPX text-format parsing. Wireshark 3.x. |
| [cisagov/icsnpp-ge-srtp](https://github.com/cisagov/icsnpp-ge-srtp) | Zeek + Spicy analyzer (CISA) | Production. Logs 40+ fields including service request code, segment selector, memory offset, status, PLC state, programmer-attachment, OEM-protection bit, sweep time. Default-disabled (`ZEEK_DISABLE_ICS_GE_SRTP=true`) because it is considered uncommon. |
| Mainline Wireshark | C dissector in `epan/dissectors/` | **Does not exist.** No `packet-ge_srtp.c` / `packet-ge-srtp.c` / `packet-fanuc.c` etc. |
| Suricata | Native app-layer parser | **Does not exist.** No PR or RFC located on OISF/suricata. |
| Reference | "Leveraging the SRTP protocol for over-the-network memory acquisition of a GE Fanuc Series 90-30" — Denton et al. 2017, [ScienceDirect](https://www.sciencedirect.com/science/article/pii/S1742287617301925) | The byte-layout source of truth used by both community projects. |

### What this means for SuriCraft

- The byte-pattern rules SuriCraft already emits for GE-SRTP (anchor on `dsize:56`, `|02|` at offset 0, service code at offset 42) are correct — Denton et al. is the upstream truth and both ICSNPP and Palatis cite it.
- No upstream Wireshark `value_string` table to extract from. The 8 service codes the SuriCraft catalog covers (0x06 Read Program, 0x07 Write System, 0x08 Write Task, 0x09 Write Program, 0x43 Return Controller Type, 0x80 Privilege Login) stay hand-curated, with citations to Denton 2017.
- Roadmap: optionally fork or vendor-import [Palatis/packet-ge-srtp](https://github.com/Palatis/packet-ge-srtp)'s Lua dissector value tables to drive a richer `srtp` reference JSON.

## Other OT protocols worth integrating

The CISA ICSNPP project ([cisagov/ICSNPP](https://github.com/cisagov/ICSNPP)) is the most comprehensive single source for "what OT protocols are operationally significant enough to have a maintained parser." Their full list of fully-developed Zeek parsers:

| Protocol | ICSNPP repo | Wireshark mainline | Suricata native | Notes |
|---|---|---|---|---|
| BACnet | [icsnpp-bacnet](https://github.com/cisagov/icsnpp-bacnet) | yes (`packet-bacnet.c`, `packet-bacapp.c`) | no | already a SuriCraft stub |
| BSAP (Bristol SCADA) | [icsnpp-bsap](https://github.com/cisagov/icsnpp-bsap) | yes (`packet-bsap.c`) | no | both IP and serial variants |
| C12.22 (smart meter) | [icsnpp-c1222](https://github.com/cisagov/icsnpp-c1222) | yes (`packet-c1222.c`) | no | electrical metering |
| EtherCAT | [icsnpp-ethercat](https://github.com/cisagov/icsnpp-ethercat) | yes (`packet-ecat.c` plus mailbox sub-dissectors) | no | mostly L2; needs TAP that preserves L2 |
| EtherNet/IP + CIP | [icsnpp-enip](https://github.com/cisagov/icsnpp-enip) | yes (`packet-enip.c`, `packet-cip.c`) | yes | already covered |
| GE-SRTP | [icsnpp-ge-srtp](https://github.com/cisagov/icsnpp-ge-srtp) | community Lua only | no | already covered (byte rules) |
| Genisys | [icsnpp-genisys](https://github.com/cisagov/ICSNPP-Genisys) | unknown | no | older SCADA, niche |
| HART-IP | [icsnpp-hart-ip](https://github.com/cisagov/icsnpp-hart-ip) | yes (`packet-hart_ip.c`) | no | already a SuriCraft stub |
| Omron FINS | [icsnpp-omron-fins](https://github.com/cisagov/icsnpp-omron-fins) | yes (`packet-omron-fins.c`) | no | dominant Omron PLC protocol |
| OPC UA Binary | [icsnpp-opcua-binary](https://github.com/cisagov/icsnpp-opcua-binary) | yes (`packet-opcua.c`) | partial (since 6.0) | already a SuriCraft stub |
| Profinet I/O CM | [icsnpp-profinet-io-cm](https://github.com/cisagov/icsnpp-profinet-io-cm) | yes (`packet-pn-rt.c`, `packet-pn-dcp.c`, `packet-pn-io.c`) | no | already a SuriCraft stub |
| ROC Plus | [icsnpp-roc-plus](https://github.com/cisagov/icsnpp-roc-plus) | unknown | no | Emerson RTU; oil & gas |
| S7Comm + S7CommPlus | [icsnpp-s7comm](https://github.com/cisagov/icsnpp-s7comm) | yes (`packet-s7comm.c`) | no | already covered (S7Comm); S7CommPlus stays a stub (encrypted) |
| Synchrophasor (C37.118) | [icsnpp-synchrophasor](https://github.com/cisagov/icsnpp-synchrophasor) | yes (`packet-synphasor.c`) | no | electric power phasor data |

ICSNPP also publishes extension scripts (additional logging) for DNP3 and Modbus — orthogonal to SuriCraft's needs.

Additional protocols worth noting that ICSNPP does *not* cover but are relevant:

| Protocol | Wireshark | Use case |
|---|---|---|
| IEC 61850 MMS | `packet-mms.c` | substations; already a SuriCraft stub |
| IEC 61850 GOOSE | `packet-goose.c` | substations; **L2 multicast** — TAP not SPAN |
| IEC 61850 SV (Sampled Values) | `packet-sv.c` | substations; L2 multicast |
| Niagara Fox / Tridium | unknown | building automation, distinct from BACnet |
| Sparkplug B (MQTT for ICS) | covered by `packet-mqtt.c` + payload | newer convergent protocol |
| Modbus Plus | `packet-mbtcp.c` does not cover it | legacy |
| Schneider UMAS | unknown | proprietary, on top of Modbus TCP |

External reference: [Orange-Cyberdefense/awesome-industrial-protocols](https://github.com/Orange-Cyberdefense/awesome-industrial-protocols) is a community-maintained list of OT protocols with security-oriented notes, papers, and tooling links per protocol. Useful as a starting point when scoping new additions.

## Recommended top 5 to integrate next

Ranked by deployment prevalence and what byte-rule detections SuriCraft can plausibly emit without a Suricata-native parser:

1. **Synchrophasor (IEEE C37.118)** — electric power, Wireshark has `packet-synphasor.c`, ICSNPP has a parser, and the framing is regular enough for byte rules. Substantial deployment in transmission utilities. Promote from "not in catalog" to a new native renderer with byte rules.
2. **IEC 61850 GOOSE** — substation automation. Wireshark dissector exists. **L2-only** caveat (same as PROFINET) means coverage requires a TAP that preserves L2. Add as a stub today; keep the L2 caveat in coverage-gaps.
3. **Omron FINS** — dominant in Omron-heavy plants (automotive, factory automation). Wireshark and ICSNPP both cover it. Byte rules viable on TCP/UDP 9600.
4. **HART-IP detection coverage** — already a stub; promote to native renderer. Wireshark + ICSNPP both cover it. Process industry SCADA.
5. **OPC UA Binary detection coverage** — already a stub; promote. Suricata has had partial app-layer support since 6.0 — investigate using the keyword if available, fall back to byte rules. Modern ICS convergent protocol.

After those: BSAP, EtherCAT, ROC Plus, Genisys, C12.22 round out the "complete CISA-coverage" list but are more niche.

## What to do with this

These are roadmap items. Each requires:

- A `wireshark-tables/<proto>.json` extraction (run `scripts/extract_wireshark.py` after adding the protocol's filename to `DISSECTORS`).
- A renderer in `src/rule-engine/emitters/suricata.js` (byte rules for the non-native ones).
- Catalog entries in `default-detections.json` for the operationally significant function/service codes.
- Coverage-gap notes for known limitations (L2-only protocols, encrypted variants, etc.).

Open issues against [SuriCraft](https://github.com/mwilco03/SuriCraft/issues) to track each protocol's add as a separate work item.

## Sources

- [GitHub - cisagov/ICSNPP: Industrial Control Systems Network Protocol Parsers](https://github.com/cisagov/ICSNPP)
- [GitHub - cisagov/icsnpp-ge-srtp: Zeek GE SRTP Parser](https://github.com/cisagov/icsnpp-ge-srtp)
- [GitHub - Palatis/packet-ge-srtp: Wireshark Lua dissector](https://github.com/Palatis/packet-ge-srtp)
- [Leveraging the SRTP protocol for over-the-network memory acquisition of a GE Fanuc Series 90-30 - ScienceDirect](https://www.sciencedirect.com/science/article/pii/S1742287617301925)
- [GitHub - Orange-Cyberdefense/awesome-industrial-protocols](https://github.com/Orange-Cyberdefense/awesome-industrial-protocols)
- [Service Request Transport Protocol - Wikipedia](https://en.wikipedia.org/wiki/Service_Request_Transport_Protocol)
- [Wireshark Wiki - Protocols/ethercat](https://wiki.wireshark.org/Protocols/ethercat)
- [Zeek Package Manager Packages](https://packages.zeek.org/packages?q=cisagov)
