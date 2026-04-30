// requires: OT.suricataEmitter, OT.edgeValidator
window.OT = window.OT || {};
(function (OT) {
  const { useMemo } = React;
  const { generateRules } = OT.suricataEmitter;
  const { validateEdgesAgainstRules } = OT.edgeValidator;

  function StepReview({ state, setState, catalog }) {
    const rules = useMemo(() => generateRules(state, catalog), [state, catalog]);
    const findings = useMemo(() => validateEdgesAgainstRules(state, rules), [state, rules]);
    const findingsBySid = useMemo(() => {
      const m = {};
      for (const f of findings) {
        if (!m[f.sid]) m[f.sid] = [];
        m[f.sid].push(f);
      }
      return m;
    }, [findings]);

    const editComment = (id, lines) =>
      setState({ ...state, commentOverrides: { ...state.commentOverrides, [id]: lines } });

    if (rules.length === 0) {
      return <div className="panel"><div className="empty">no rules selected. go back to step 4.</div></div>;
    }

    return (
      <div className="panel">
        <h2>review &amp; edit</h2>
        <p className="lead">
          {rules.length} rules ready. comments are editable and travel with the rule into the bundle.
          {findings.length > 0 ? " " + findings.length + " documented flow(s) will trigger one or more rules; see inline." : ""}
        </p>
        {rules.map((r) => {
          const fs = findingsBySid[r.sid] || [];
          return (
            <div key={r.sid} className="review-rule">
              <h4>
                <span style={{ fontFamily: "var(--mono)", color: "var(--text-2)", fontSize: 11 }}>SID {r.sid}</span>
                {r.det.title}
                {r.det.critical ? <span className="pill crit">critical</span> : null}
                <span className="pill proto">{r.det.protocol}</span>
                {fs.length > 0 ? <span className="pill warn">{fs.length} edge match{fs.length === 1 ? "" : "es"}</span> : null}
              </h4>
              <textarea
                rows={Math.max(3, (state.commentOverrides[r.det.id] || r.det.comment).length)}
                value={(state.commentOverrides[r.det.id] || r.det.comment).join("\n")}
                onChange={(e) => editComment(r.det.id, e.target.value.split("\n"))}
                style={{ marginBottom: 8 }}
              />
              <pre className="rule">{r.rule}</pre>
              {fs.length > 0 ? (
                <div className="help" style={{ marginTop: 8 }}>
                  <div style={{ fontWeight: 500, marginBottom: 4 }}>documented edges that may trigger this rule:</div>
                  {fs.map((f, i) => (
                    <div key={i} style={{ fontSize: 12, marginTop: 3 }}>
                      <span style={{ fontFamily: "var(--mono)" }}>{f.fromName} ({f.fromIp})</span>
                      {" → "}
                      <span style={{ fontFamily: "var(--mono)" }}>{f.toName} ({f.toIp})</span>
                      {f.note ? <span style={{ color: "var(--text-2)" }}> · {f.note}</span> : null}
                    </div>
                  ))}
                  <div style={{ fontSize: 11, marginTop: 6, color: "var(--text-2)" }}>
                    validator matches by protocol + target only, not by sub-op (function code, CIP service, etc). For sub-op-specific rules an edge may never carry the matching op. fix: add a role for the source in step 2, broaden allowedRoles, or accept as intended.
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    );
  }

  OT.ui = OT.ui || {};
  OT.ui.StepReview = StepReview;
})(window.OT);
