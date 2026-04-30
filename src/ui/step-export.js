// requires: OT.suricataEmitter, OT.coverageGaps, OT.edgeValidator, OT.malcolmBundle, OT.zip
window.OT = window.OT || {};
(function (OT) {
  const { useMemo, useState } = React;
  const { generateRules } = OT.suricataEmitter;
  const { computeCoverageGaps } = OT.coverageGaps;
  const { validateEdgesAgainstRules } = OT.edgeValidator;
  const { generateBundle, bundleTargetPath } = OT.malcolmBundle;
  const { downloadFile, downloadZip } = OT.zip;

  function StepExport({ state, catalog }) {
    const [emitter, setEmitter] = useState("suricata");
    const showEmitterSelect = false;

    const bundle = useMemo(() => generateBundle(state, catalog), [state, catalog]);
    const rules = useMemo(() => generateRules(state, catalog), [state, catalog]);
    const gaps = useMemo(() => computeCoverageGaps(state, catalog), [state, catalog]);
    const findings = useMemo(() => validateEdgesAgainstRules(state, rules), [state, rules]);

    const downloadAllIndividual = () =>
      Object.entries(bundle).forEach(([n, c]) => downloadFile(n, c));

    const downloadAllZip = async () => {
      try {
        await downloadZip(bundle, (state.siteName || "ics") + "-bundle.zip");
      } catch (e) {
        alert("zip download failed: " + e.message);
      }
    };

    const issues = [];
    const seen = new Set();
    for (const r of rules) {
      if (seen.has(r.sid)) issues.push("SID collision at " + r.sid);
      seen.add(r.sid);
    }
    if ((state.assets || []).length === 0) issues.push("no assets configured");
    const orphan = (catalog.detections || []).filter(
      (d) => state.detectionsOn[d.id] &&
        !(d.targetRoles || []).some((r) =>
          state.assets.some((a) => (a.roles || []).some((rp) => rp.role === r && rp.protocol === d.protocol)))
    );
    if (orphan.length > 0) issues.push(orphan.length + " detection(s) enabled without matching target assets");
    if (findings.length > 0) {
      const distinctSids = new Set(findings.map((f) => f.sid)).size;
      issues.push(findings.length + " documented flow(s) will trigger " + distinctSids + " rule(s) on legitimate traffic; see edge-findings.md");
    }

    return (
      <>
        <div className="panel">
          <h2>export bundle (Malcolm-shaped)</h2>
          <p className="lead">drop the files into the listed paths under your Malcolm install directory, then run the docker compose exec reload commands from README.md.</p>
          {showEmitterSelect ? (
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, color: "var(--text-2)", marginRight: 8 }}>emitter:</label>
              <select value={emitter} onChange={(e) => setEmitter(e.target.value)} style={{ maxWidth: 160 }}>
                <option value="suricata">suricata</option>
              </select>
            </div>
          ) : null}
          <div className="grid3" style={{ marginBottom: 16 }}>
            <div className="stat ok"><div className="label">rules</div><div className="value">{rules.length}</div></div>
            <div className="stat danger"><div className="label">critical</div><div className="value">{rules.filter((r) => r.det.critical).length}</div></div>
            <div className="stat warn"><div className="label">edge findings</div><div className="value">{findings.length}</div></div>
          </div>
          {issues.length > 0 ? (
            <div className="help">
              <div style={{ fontWeight: 500, marginBottom: 4 }}>issues to review</div>
              {issues.map((s, i) => <div key={i}>• {s}</div>)}
            </div>
          ) : null}
          {gaps.length > 0 ? (
            <details open>
              <summary>{gaps.length} coverage gap(s) (full text in coverage-gaps.md)</summary>
              <div style={{ marginTop: 8 }}>
                {gaps.map((g, i) => (
                  <div className="gap-block" key={i}>
                    <div className="gap-title">{g.title}</div>
                    <div className="gap-detail">{g.detail}</div>
                  </div>
                ))}
              </div>
            </details>
          ) : <div className="help ok">no coverage gaps detected for the current asset set.</div>}
          <div style={{ marginTop: 16 }}>
            {Object.keys(bundle).map((name) => (
              <div className="file" key={name}>
                <span>
                  <span style={{ fontWeight: 500 }}>{name}</span>
                  <span className="path" style={{ marginLeft: 8 }}>{bundleTargetPath(name)}</span>
                </span>
                <button onClick={() => downloadFile(name, bundle[name])}>download</button>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 16, display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button className="primary" onClick={downloadAllZip}>download all (zip)</button>
            <button onClick={downloadAllIndividual}>download all (individual files)</button>
            <button onClick={() => navigator.clipboard.writeText(bundle["custom-ics.rules"])}>copy rules to clipboard</button>
          </div>
        </div>
        <details>
          <summary>preview: custom-ics.rules</summary>
          <pre className="rule" style={{ marginTop: 8, maxHeight: 360, overflowY: "auto" }}>{bundle["custom-ics.rules"]}</pre>
        </details>
        <details>
          <summary>preview: custom-ics-include.yaml</summary>
          <pre className="rule" style={{ marginTop: 8, maxHeight: 360, overflowY: "auto" }}>{bundle["custom-ics-include.yaml"]}</pre>
        </details>
        <details>
          <summary>preview: coverage-gaps.md</summary>
          <pre className="rule" style={{ marginTop: 8, maxHeight: 360, overflowY: "auto" }}>{bundle["coverage-gaps.md"]}</pre>
        </details>
        {bundle["edge-findings.md"] ? (
          <details>
            <summary>preview: edge-findings.md</summary>
            <pre className="rule" style={{ marginTop: 8, maxHeight: 360, overflowY: "auto" }}>{bundle["edge-findings.md"]}</pre>
          </details>
        ) : null}
      </>
    );
  }

  OT.ui = OT.ui || {};
  OT.ui.StepExport = StepExport;
})(window.OT);
