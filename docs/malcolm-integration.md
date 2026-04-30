# Malcolm integration

The bundle this tool exports is shaped for Malcolm's documented configuration paths.

## Files in the bundle

| Bundle file | Place at (relative to Malcolm install dir) |
|---|---|
| `custom-ics.rules` | `./suricata/rules/custom-ics.rules` |
| `custom-ics-include.yaml` | `./suricata/include-configs/custom-ics-include.yaml` |
| `threshold.config` | `./suricata/include-configs/threshold.config` |
| `coverage-gaps.md` | side document; protocols not covered |
| `edge-findings.md` | side document; documented flows that will alert on legitimate traffic |
| `asset-model.json` | side document; re-import into the SPA to edit |
| `README.md` | the deploy commands below, regenerated per-bundle |

## Why these paths

Malcolm watches `./suricata/rules/` for `.rules` files and applies them on the next PCAP upload (and immediately on live-suricata reload). It also concatenates every file in `./suricata/include-configs/` to the end of the generated `suricata.yaml` inside an `include:` section, which means our overlay does not have to fight Malcolm's own templating.

The `threshold-file:` directive in our include-yaml points at `/var/lib/suricata/include-configs/threshold.config` because that is the path inside the suricata container after Malcolm bind-mounts the include-configs directory.

## Deploy on the Malcolm aggregator

From the Malcolm installation directory:

```sh
cp custom-ics.rules ./suricata/rules/
cp custom-ics-include.yaml ./suricata/include-configs/
cp threshold.config ./suricata/include-configs/

docker compose exec suricata /usr/local/bin/docker_entrypoint.sh true
docker compose exec suricata-live /usr/local/bin/docker_entrypoint.sh true
docker compose exec suricata-live supervisorctl restart live-suricata
```

The first `docker_entrypoint.sh true` regenerates `suricata.yaml` and applies the rules to the PCAP-upload path. The second does the same for live-suricata. The `supervisorctl restart live-suricata` cycles the live process so it picks up the new ruleset and config.

## Optional Malcolm flags

Set in Malcolm's `.env` (or `control_vars.conf` on Hedgehog):

| Variable | Effect |
|---|---|
| `SURICATA_CUSTOM_RULES_ONLY=true` | bypasses Malcolm's default ruleset; only `./suricata/rules/*.rules` fire |
| `SURICATA_DISABLE_ICS_ALL=true` | disables Malcolm's built-in ICS/OT rules. Combine with the bundle to avoid double-alerting on the same traffic. |

## Deploy on a Hedgehog sensor (separate from aggregator)

Hedgehog uses a different filesystem path:

```sh
cp custom-ics.rules /opt/sensor/sensor_ctl/suricata/rules/
# SURICATA_CUSTOM_RULES_ONLY lives in /opt/sensor/sensor_ctl/control_vars.conf
```

The include-yaml and threshold paths follow the same pattern relative to `sensor_ctl`. Restart the sensor service after copying.

## Verifying

After reload, in OpenSearch / Arkime / your preferred Malcolm front-end, filter for `event.dataset:"alert"` and `metadata.ics_diagram_rev:"<your rev>"`. Hits with that metadata key are from your bundle; hits without it are from Malcolm's built-in rules.
