// requires: OT.addressGroups, OT.suricataEmitter, OT.coverageGaps, OT.edgeValidator
window.OT = window.OT || {};
(function (OT) {
  const { addressGroupsForBundle } = OT.addressGroups;
  const { generateRules } = OT.suricataEmitter;
  const { computeCoverageGaps } = OT.coverageGaps;
  const { validateEdgesAgainstRules } = OT.edgeValidator;

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
      "# SID range: " + state.sidBase + "-" + (state.sidBase + 99999),
      "#",
      "# Drop this file wherever your Suricata install loads rule files from.",
      "# Validate with: suricata -T -c /etc/suricata/suricata.yaml -S custom-ics.rules",
      "# Required overlay: custom-ics-include.yaml (sets stream-depth and address-groups).",
      "#",
      "",
      ...rules.map((r) => r.comment + "\n" + r.rule + "\n"),
    ].join("\n");

    // Only emit app-layer protocol blocks for protocols that actually have
    // at least one (role, protocol) pair on a real asset. No point enabling
    // the Modbus parser if nothing in this site speaks Modbus.
    const usedProtocols = new Set();
    for (const a of state.assets || []) {
      for (const rp of a.roles || []) usedProtocols.add(rp.protocol);
    }
    const nativeProtos = Object.keys(catalog.protocols || {}).filter(
      (p) => (catalog.protocols[p].parser === "native") && usedProtocols.has(p)
    );

    const appLayerLines = [];
    if (nativeProtos.length > 0) {
      appLayerLines.push("app-layer:");
      appLayerLines.push("  protocols:");
      for (const p of nativeProtos) {
        const port = catalog.protocols[p].port;
        appLayerLines.push("    " + p + ":");
        appLayerLines.push("      enabled: yes");
        appLayerLines.push("      detection-ports:");
        appLayerLines.push("        dp: " + port);
        if (p === "modbus") appLayerLines.push("      stream-depth: 0");
      }
    }

    const includeYaml = [
      "# " + state.siteName + " - Suricata config overlay",
      "#",
      "# Either include this file from suricata.yaml:",
      "#   include: /path/to/custom-ics-include.yaml",
      "# or paste its contents into suricata.yaml directly.",
      "",
      "stream:",
      "  reassembly:",
      "    depth: 0",
      "",
      "vars:",
      "  address-groups:",
      ...Object.entries(groupAddrs).sort().map(([k, v]) => "    " + k + ': "' + v + '"'),
      "",
      "# threshold-file: /path/to/threshold.config   # set this in suricata.yaml; point at where you placed threshold.config",
      ...(appLayerLines.length > 0 ? ["", ...appLayerLines] : []),
    ].join("\n");

    const threshold = [
      "# " + state.siteName + " - Suricata threshold/event_filter overlay",
      "#",
      "# Reference from suricata.yaml as:  threshold-file: /path/to/threshold.config",
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
      "# " + state.siteName + " - Suricata custom ruleset",
      "",
      "Generated by SuriCraft, diagram revision " + state.diagramRev + ".",
      "",
      "## Files",
      "",
      "- `custom-ics.rules` - the rules; place where Suricata loads rule files from",
      "- `custom-ics-include.yaml` - config overlay (stream-depth, address-groups, app-layer ports)",
      "- `threshold.config` - per-SID dedup; point `threshold-file:` at it from suricata.yaml",
      "- `coverage-gaps.md` - protocols and behaviors not covered by this ruleset",
      edgeFindingsDoc ? "- `edge-findings.md` - documented flows that will alert on legitimate traffic" : null,
      "- `asset-model.json` - re-import into the SPA to edit later",
      "",
      "## Deploy (generic Suricata)",
      "",
      "1. Place `custom-ics.rules` where Suricata loads rules from. Common paths:",
      "   - `/etc/suricata/rules/`",
      "   - `/var/lib/suricata/rules/`",
      "   - or whatever is listed under `rule-files:` in your `suricata.yaml`.",
      "2. Either include the overlay file from `suricata.yaml`:",
      "   ```yaml",
      "   include: /etc/suricata/custom-ics-include.yaml",
      "   ```",
      "   or paste the contents of `custom-ics-include.yaml` into `suricata.yaml` directly.",
      "3. Place `threshold.config` somewhere readable, then set in `suricata.yaml`:",
      "   ```yaml",
      "   threshold-file: /etc/suricata/threshold.config",
      "   ```",
      "4. Validate before reload:",
      "   ```sh",
      "   suricata -T -c /etc/suricata/suricata.yaml -S /etc/suricata/rules/custom-ics.rules",
      "   ```",
      "5. Reload (no restart needed if your Suricata supports SIGUSR2 ruleset reload):",
      "   ```sh",
      "   kill -USR2 $(pidof suricata)",
      "   ```",
      "   Otherwise restart the service via your init system.",
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
      "custom-ics.rules":         "Suricata rules dir (rule-files: in suricata.yaml)",
      "custom-ics-include.yaml":  "include from suricata.yaml or paste inline",
      "threshold.config":         "anywhere readable; point threshold-file: at it",
      "coverage-gaps.md":         "review with the SOC; protocols not covered",
      "edge-findings.md":         "review with the SOC; documented flows that will alert",
      "README.md":                "deployment notes (keep alongside)",
      "asset-model.json":         "re-import to edit later",
    };
    return map[name] || "";
  }

  OT.bundle = { generateBundle, bundleTargetPath };
})(window.OT);
