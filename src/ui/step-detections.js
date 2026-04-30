window.OT = window.OT || {};
(function (OT) {
  const { useState } = React;

  function StepDetections({ state, setState, catalog }) {
    const DETECTIONS = catalog.detections || [];
    const PROTOCOLS = catalog.protocols || {};
    const [showOrphans, setShowOrphans] = useState(false);

    const coverable = (d) =>
      (d.targetRoles || []).some((r) =>
        state.assets.some((a) => (a.roles || []).some((rp) => rp.role === r && rp.protocol === d.protocol))
      );

    const toggle = (id) =>
      setState({ ...state, detectionsOn: { ...state.detectionsOn, [id]: !state.detectionsOn[id] } });

    const setAll = (predicate) => {
      const next = {};
      for (const d of DETECTIONS) next[d.id] = predicate(d);
      setState({ ...state, detectionsOn: next });
    };

    const presetDefaults = () => setAll((d) => !!d.enabledByDefault);
    const presetCritical = () => setAll((d) => !!d.critical);
    const presetWrites   = () => setAll((d) => d.opclass === "write");
    const presetAllOff   = () => setAll(() => false);
    const presetAllOn    = () => setAll(() => true);

    const visibleDetections = showOrphans ? DETECTIONS : DETECTIONS.filter(coverable);
    const hiddenCount = DETECTIONS.length - visibleDetections.length;

    const byProto = {};
    for (const d of visibleDetections) {
      if (!byProto[d.protocol]) byProto[d.protocol] = [];
      byProto[d.protocol].push(d);
    }
    const enabledCount = DETECTIONS.filter((d) => state.detectionsOn[d.id]).length;
    const criticalEnabledCount = DETECTIONS.filter((d) => state.detectionsOn[d.id] && d.critical).length;

    return (
      <div className="panel">
        <h2>detections</h2>
        <p className="lead">curated by protocol. the comment under each title is the thinking behind the detection.</p>

        <div className="toolbar" style={{ borderBottom: "0.5px solid var(--border)", paddingBottom: 10, marginBottom: 12 }}>
          <span style={{ fontSize: 12, color: "var(--text-2)" }}>presets:</span>
          <button onClick={presetDefaults}>defaults</button>
          <button onClick={presetCritical}>critical only</button>
          <button onClick={presetWrites}>writes only</button>
          <button onClick={presetAllOn}>all on</button>
          <button onClick={presetAllOff}>all off</button>
          <span style={{ flex: 1 }} />
          <label style={{ fontSize: 12, color: "var(--text-2)", display: "flex", alignItems: "center", gap: 4, width: "auto" }}>
            <input
              type="checkbox"
              checked={showOrphans}
              onChange={(e) => setShowOrphans(e.target.checked)}
              style={{ width: "auto", margin: 0 }}
            />
            show orphans ({hiddenCount} hidden)
          </label>
        </div>

        <div style={{ fontSize: 12, color: "var(--text-2)", marginBottom: 12 }}>
          {enabledCount} of {DETECTIONS.length} detections enabled · {criticalEnabledCount} critical
        </div>

        {Object.keys(byProto).length === 0 ? (
          <div className="empty">
            no detections match the current asset roles. add target assets in step 1+2, or check "show orphans" to see all detections.
          </div>
        ) : null}

        {Object.entries(byProto).map(([proto, list]) => (
          <details key={proto} open>
            <summary>
              <span style={{ fontWeight: 500, color: "var(--text)" }}>{PROTOCOLS[proto]?.label || proto}</span>
              <span style={{ color: "var(--text-2)", marginLeft: 8 }}>
                {list.filter((d) => state.detectionsOn[d.id]).length} / {list.length} on
              </span>
              {PROTOCOLS[proto]?.parser === "byte" ? (
                <span className="pill warn" style={{ marginLeft: 8 }}>byte rules only</span>
              ) : null}
            </summary>
            <div style={{ marginTop: 8 }}>
              {list.map((d) => {
                const on = !!state.detectionsOn[d.id];
                const cov = coverable(d);
                return (
                  <div key={d.id} className={"det " + (on ? "on" : "")} onClick={() => toggle(d.id)}>
                    <div className="check">{on ? "✓" : ""}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="det-title">{d.title}
                        {d.critical ? <span className="pill crit" style={{ marginLeft: 6 }}>critical</span> : null}
                        {!cov ? <span className="pill warn" style={{ marginLeft: 6 }}>no target asset</span> : null}
                      </div>
                      <div className="meta">{d.comment[0]}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </details>
        ))}
      </div>
    );
  }

  OT.ui = OT.ui || {};
  OT.ui.StepDetections = StepDetections;
})(window.OT);
