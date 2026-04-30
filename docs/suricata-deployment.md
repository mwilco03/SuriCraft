# Suricata deployment

The bundle this tool exports is generic Suricata. No platform assumptions, no DB integrations, no vendor-specific paths.

## Files in the bundle

| Bundle file | Where it goes |
|---|---|
| `custom-ics.rules` | Suricata rules dir (whatever `rule-files:` in `suricata.yaml` lists). Common: `/etc/suricata/rules/`, `/var/lib/suricata/rules/`. |
| `custom-ics-include.yaml` | Either include from `suricata.yaml` (`include: /path/to/custom-ics-include.yaml`) or paste contents inline. |
| `threshold.config` | Anywhere readable. Reference from `suricata.yaml` as `threshold-file: /path/to/threshold.config`. |
| `coverage-gaps.md` | side document; protocols not covered |
| `edge-findings.md` | side document; documented flows that will alert on legitimate traffic |
| `asset-model.json` | side document; re-import into the SPA to edit |
| `README.md` | the deploy commands below, regenerated per-bundle |

## Deploy

1. Place `custom-ics.rules` where Suricata loads rule files from. Confirm the path is in `rule-files:` of `suricata.yaml` (or add it).

2. Wire the overlay into `suricata.yaml`. Either include it:

   ```yaml
   include: /etc/suricata/custom-ics-include.yaml
   ```

   or paste the contents of `custom-ics-include.yaml` directly into `suricata.yaml`. The overlay sets:

   - `stream.reassembly.depth: 0` (mandatory for Modbus on long-lived flows)
   - `vars.address-groups` (per-role + per-protocol IP lists derived from your inventory)
   - `app-layer.protocols.{modbus,dnp3,enip}` enabled with detection-ports

3. Point `threshold-file:` at where you placed `threshold.config`:

   ```yaml
   threshold-file: /etc/suricata/threshold.config
   ```

4. Validate before reloading:

   ```sh
   suricata -T -c /etc/suricata/suricata.yaml -S /etc/suricata/rules/custom-ics.rules
   ```

5. Reload. If your Suricata supports SIGUSR2 ruleset reload (most modern builds do):

   ```sh
   kill -USR2 $(pidof suricata)
   ```

   Otherwise restart the service via your init system (`systemctl restart suricata`, `service suricata restart`, etc.).

## What the overlay does

The address-groups block creates Suricata variables you can reference in custom rules. For each role-protocol combination in your inventory, you get a group like `ALLOWED_HMI_MODBUS` resolving to the IP list. The generated rules in `custom-ics.rules` use literal IP lists for clarity in the rule preview, but you can rewrite them to reference these vars if your team prefers.

## What `threshold.config` does

Per-SID `event_filter` rules suppress duplicate alerts within a window:

- Write/recon ops: 5-minute window, 1 alert per source.
- Program-related ops: 1-hour window, 1 alert per source.
- Critical detections (DNP3 cold restart, CIP Stop, S7 PLC Stop, etc.) have no dedup. Every event fires.

Tune the windows in `threshold.config` to your alert tolerance.

## Verifying

Each generated rule carries metadata you can filter on in `eve.json`:

- `metadata.ics_protocol` - one of `modbus`, `dnp3`, `enip`, `s7comm`, `srtp`
- `metadata.ics_opclass` - `write`, `program`, `lifecycle`, `recon`, `diag`
- `metadata.ics_func` - the function/service code (decimal for Modbus/DNP3, hex string for ENIP/S7Comm/SRTP)
- `metadata.ics_severity` - `critical` if the detection was flagged critical
- `metadata.ics_diagram_rev` - the diagram revision string from the SPA, useful for tracking which version of the asset model produced a given alert

A simple `jq` over `eve.json` confirms the bundle is live:

```sh
jq -r 'select(.event_type=="alert") | .alert.metadata.ics_diagram_rev[]?' /var/log/suricata/eve.json | sort -u
```

If your diagram rev shows up, your bundle is firing.
