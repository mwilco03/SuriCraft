window.OT = window.OT || {};
(function (OT) {
  function StepDetections({ state, setState, catalog }) {
    const DETECTIONS = catalog.detections || [];
    const PROTOCOLS = catalog.protocols || {};
    const toggle = (id) =>
      setState({ ...state, detectionsOn: { ...state.detectionsOn, [id]: !state.detectionsOn[id] } });
    const coverable = (d) =>
      (d.targetRoles || []).some((r) =>
        state.assets.some((a) => (a.roles || []).some((rp) => rp.role === r && rp.protocol === d.protocol))
      );
    const byProto = {};
    for (const d of DETECTIONS) {
      if (!byProto[d.protocol]) byProto[d.protocol] = [];
      byProto[d.protocol].push(d);
    }
    return (
      <div className="panel">
        <h2>detections</h2>
        <p className="lead">curated by protocol. the comment under each title is the thinking behind the detection.</p>
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
