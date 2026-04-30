// requires: OT.addressGroups, OT.suricataEmitter, OT.coverageGaps, OT.edgeValidator
window.OT = window.OT || {};
(function (OT) {
  const { addressGroupsForBundle } = OT.addressGroups;
  const { generateRules } = OT.suricataEmitter;
  const { computeCoverageGaps } = OT.coverageGaps;
  const { validateEdgesAgainstRules } = OT.edgeValidator;

  // Malcolm's runtime location for include-configs inside the suricata container.
  const MALCOLM_INCLUDE_CONTAINER_PATH = "/var/lib/suricata/include-configs";

  function generateBundle(state, catalog) {
    const rules = generateRules(state, catalog);
    const gaps = computeCoverageGaps(state, catalog);
    const findings = validateEdgesAgainstRules(state, rules);
    const groupAddrs = addressGroupsForBundle(catalog, state.assets);

    const today = new Date().toISOString().slice(0, 10);

    const rulesFile = [
      "#",
      "# " + state.siteName + " - ICS Suricata custom rules",
      "# Diagram revision: " + state.diagramRev,
      "# Target: Malcolm",
      "# SID range: " + state.sidBase + "-" + (state.sidBase + 99999),
      "#",
      "# Drop this file at ./suricata/rules/ in your Malcolm install directory.",
      "# Required overlay: custom-ics-include.yaml (sets stream-depth and address-groups).",
      "#",
      "",
      ...rules.map((r) => r.comment + "\n" + r.rule + "\n"),
    ].join("\n");

    const includeYaml = [
      "# " + state.siteName + " - Suricata include overlay (Malcolm)",
      "# Drop at ./suricata/include-configs/custom-ics-include.yaml",
      "# Malcolm appends every file in this directory to the generated suricata.yaml",
      "# inside an include section at the end of the file.",
      "",
      "stream:",
      "  reassembly:",
      "    depth: 0",
      "",
      "vars:",
      "  address-groups:",
      ...Object.entries(groupAddrs).sort().map(([k, v]) => "    " + k + ': "' + v + '"'),
      "",
      "threshold-file: " + MALCOLM_INCLUDE_CONTAINER_PATH + "/threshold.config",
      "",
      "app-layer:",
      "  protocols:",
      "    modbus:",
      "      enabled: yes",
      "      detection-ports:",
      "        dp: 502",
      "      stream-depth: 0",
      "    dnp3:",
      "      enabled: yes",
      "      detection-ports:",
      "        dp: 20000",
      "    enip:",
      "      enabled: yes",
      "      detection-ports:",
      "        dp: 44818",
    ].join("\n");

    const threshold = [
      "# " + state.siteName + " - Suricata threshold/event_filter overlay",
      "# Drop at ./suricata/include-configs/threshold.config",
      "# Referenced by custom-ics-include.yaml as threshold-file.",
      "#",
      "# Critical detections (ics_severity critical) intentionally have NO dedup.",
      "# Write/program ops dedup by source within 5 min / 1 hour respectively.",
      "",
      ...rules.filter((r) => !r.det.critical).map((r) => {
        const window = r.det.opclass === "program" ? 3600 : 300;
        return (
          "event_filter gen_id 1, sig_id " + r.sid +
          ", type limit, track by_src, count 1, seconds " + window
        );
      }),
    ].join("\n");

    const coverageReport = [
      "# " + state.siteName + " - Coverage Gap Report",
      "# Generated " + today,
      "",
      gaps.length === 0
        ? "No coverage gaps detected."
        : gaps.length + " coverage gap(s) require separate detection coverage:",
      "",
      ...gaps.flatMap((g) => ["## " + g.title, "", g.detail, ""]),
      "## Detection summary",
      "",
      "Rules generated:    " + rules.length,
      "Critical:           " + rules.filter((r) => r.det.critical).length,
      "Assets:             " + (state.assets || []).length,
      "Protocols covered:  " + [...new Set(rules.map((r) => r.det.protocol))].join(", "),
    ].join("\n");

    const edgeFindingsDoc = findings.length === 0 ? null : [
      "# " + state.siteName + " - Edge Findings",
      "# Generated " + today,
      "#",
      "# Each finding is a documented data-flow edge that MAY trigger a generated",
      "# rule on legitimate traffic. The validator matches by (protocol, target",
      "# asset, source-not-in-allowlist) but does NOT know which sub-operation",
      "# (function code, CIP service, S7 ROSCTR) an edge actually carries. For",
      "# rules that filter on a specific sub-op (e.g. CIP Stop 0x07, S7 program",
      "# download 0x1A), an edge may never produce that particular sub-op even",
      "# if it carries the protocol generally. Treat findings as candidates to",
      "# review, not confirmed false positives.",
      "#",
      "# Resolve by (a) adding a role for the source in step 2, (b) broadening",
      "# the rule's allowedRoles in the detection definition, or (c) accepting",
      "# the alert as intended.",
      "",
      findings.length + " finding(s):",
      "",
      ...findings.flatMap((f) => [
        "## SID " + f.sid + " - " + f.detectionTitle,
        "",
        "Edge:    " + f.fromName + " (" + f.fromIp + ") -> " + f.toName + " (" + f.toIp + ") over " + f.protocol,
        "Allowed: " + (f.allowedRoles.length === 0 ? "(none, alerts on all sources)" : f.allowedRoles.join(", ")),
        f.note ? "Note:    " + f.note : "",
        "",
      ]).filter(Boolean),
    ].join("\n");

    const readme = [
      "# " + state.siteName + " ICS Suricata bundle (Malcolm)",
      "",
      "Generated by SuriCraft, diagram revision " + state.diagramRev + ".",
      "",
      "## Files in this bundle",
      "",
      "| File | Place at (Malcolm install dir) |",
      "|---|---|",
      "| `custom-ics.rules` | `./suricata/rules/custom-ics.rules` |",
      "| `custom-ics-include.yaml` | `./suricata/include-configs/custom-ics-include.yaml` |",
      "| `threshold.config` | `./suricata/include-configs/threshold.config` |",
      "| `coverage-gaps.md` | (read; protocols not covered need a separate solution) |",
      edgeFindingsDoc ? "| `edge-findings.md` | (read; documented flows that will alert) |" : null,
      "| `asset-model.json` | (re-import to edit later) |",
      "",
      "## Deploy on Malcolm aggregator",
      "",
      "From the Malcolm installation directory:",
      "",
      "```sh",
      "cp custom-ics.rules ./suricata/rules/",
      "cp custom-ics-include.yaml ./suricata/include-configs/",
      "cp threshold.config ./suricata/include-configs/",
      "",
      "# trigger config regeneration and reload",
      "docker compose exec suricata /usr/local/bin/docker_entrypoint.sh true",
      "docker compose exec suricata-live /usr/local/bin/docker_entrypoint.sh true",
      "docker compose exec suricata-live supervisorctl restart live-suricata",
      "```",
      "",
      "Optional flags (set in Malcolm's .env / control_vars.conf):",
      "",
      "- `SURICATA_CUSTOM_RULES_ONLY=true` bypasses Malcolm's default ruleset, using only files in `./suricata/rules/`.",
      "- `SURICATA_DISABLE_ICS_ALL=true` disables Malcolm's built-in ICS/OT ruleset (use this if you want only your custom rules to fire on ICS traffic).",
      "",
      "## Deploy on a Hedgehog sensor (separate from aggregator)",
      "",
      "On Hedgehog Linux the custom-rules path differs:",
      "",
      "```sh",
      "cp custom-ics.rules /opt/sensor/sensor_ctl/suricata/rules/",
      "# SURICATA_CUSTOM_RULES_ONLY lives in /opt/sensor/sensor_ctl/control_vars.conf",
      "```",
      "",
      "## Stats",
      "",
      "- " + rules.length + " rules generated",
      "- " + (state.assets || []).length + " assets in inventory",
      "- " + (state.edges || []).length + " documented data-flow edges",
      "- " + rules.filter((r) => r.det.critical).length + " critical (no dedup)",
      "- " + gaps.length + " coverage gaps (see coverage-gaps.md)",
      "- " + findings.length + " edge findings" + (edgeFindingsDoc ? " (see edge-findings.md)" : ""),
    ].filter(Boolean).join("\n");

    const assetModel = JSON.stringify(
      {
        version: 3,
        site: state.siteName,
        diagramRev: state.diagramRev,
        sidBase: state.sidBase,
        assets: state.assets,
        edges: state.edges || [],
        detectionsOn: state.detectionsOn,
        commentOverrides: state.commentOverrides,
      },
      null,
      2
    );

    const bundle = {
      "custom-ics.rules": rulesFile,
      "custom-ics-include.yaml": includeYaml,
      "threshold.config": threshold,
      "coverage-gaps.md": coverageReport,
      "README.md": readme,
      "asset-model.json": assetModel,
    };
    if (edgeFindingsDoc) bundle["edge-findings.md"] = edgeFindingsDoc;
    return bundle;
  }

  function bundleTargetPath(name) {
    const map = {
      "custom-ics.rules":         "./suricata/rules/custom-ics.rules",
      "custom-ics-include.yaml":  "./suricata/include-configs/custom-ics-include.yaml",
      "threshold.config":         "./suricata/include-configs/threshold.config",
      "coverage-gaps.md":         "review with the SOC; protocols not covered",
      "edge-findings.md":         "review with the SOC; documented flows that will alert",
      "README.md":                "deployment notes (keep alongside)",
      "asset-model.json":         "re-import to edit later",
    };
    return map[name] || "";
  }

  OT.malcolmBundle = { generateBundle, bundleTargetPath };
})(window.OT);
