window.OT = window.OT || {};
(function (OT) {
  const { useState } = React;

  function StepFlows({ state, setState, catalog, demoEdges, demoAssets }) {
    const PROTOCOLS = catalog.protocols || {};
    const STUBS = catalog.stubs || {};
    const protoOptions = [
      ...Object.entries(PROTOCOLS).map(([k, p]) => ({ value: k, label: p.label.split(" ")[0] })),
      ...Object.entries(STUBS).map(([k, s]) => ({ value: k, label: s.label.split(" ")[0] })),
    ];
    const firstProto = protoOptions[0] ? protoOptions[0].value : "modbus";

    const [from, setFrom] = useState("");
    const [to, setTo] = useState("");
    const [proto, setProto] = useState(firstProto);
    const [note, setNote] = useState("");
    const assets = state.assets;
    const edges = state.edges || [];
    const assetById = Object.fromEntries(assets.map((a) => [a.id, a]));

    if (assets.length === 0) {
      return <div className="panel"><div className="empty">no assets to wire up. go back to step 1.</div></div>;
    }

    const addEdge = () => {
      if (!from || !to || from === to) return;
      setState({ ...state, edges: [...edges, { from, to, protocol: proto, note: note.trim() }] });
      setFrom("");
      setTo("");
      setNote("");
    };
    const removeEdge = (i) => setState({ ...state, edges: edges.filter((_, j) => j !== i) });

    const loadDemoEdges = () => {
      if (!demoEdges) return;
      const demoIds = new Set((demoAssets || []).map((a) => a.id));
      const referenced = demoEdges.flatMap((e) => [e.from, e.to]);
      const allReferenced = referenced.every((id) => assets.some((a) => a.id === id));
      if (!allReferenced && !referenced.every((id) => demoIds.has(id))) {
        alert("demo edges reference demo asset IDs. load the reference network in step 1 first.");
        return;
      }
      setState({ ...state, edges: demoEdges });
    };

    return (
      <div className="panel">
        <h2>data flows</h2>
        <p className="lead">document expected protocol edges between assets. used to flag rules that will alert on legitimate documented traffic.</p>
        <div className="toolbar">
          <select value={from} onChange={(e) => setFrom(e.target.value)} style={{ maxWidth: 240 }}>
            <option value="">from...</option>
            {assets.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          <span style={{ color: "var(--text-2)" }}>›</span>
          <select value={proto} onChange={(e) => setProto(e.target.value)} style={{ maxWidth: 170 }}>
            {protoOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <span style={{ color: "var(--text-2)" }}>›</span>
          <select value={to} onChange={(e) => setTo(e.target.value)} style={{ maxWidth: 240 }}>
            <option value="">to...</option>
            {assets.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          <input
            placeholder="note (optional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            style={{ maxWidth: 200 }}
          />
          <button className="primary" onClick={addEdge} disabled={!from || !to || from === to}>+ add edge</button>
        </div>
        {edges.length === 0 ? (
          <>
            <div className="empty">no flows yet. add one above, or load reference flows.</div>
            <div style={{ marginTop: 14 }}>
              <button onClick={loadDemoEdges} disabled={!demoEdges}>
                load reference flows ({demoEdges ? demoEdges.length : 0} edges)
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="row head" style={{ gridTemplateColumns: "2fr 1fr 2fr 2fr 60px" }}>
              <span>from</span><span>protocol</span><span>to</span><span>note</span><span></span>
            </div>
            {edges.map((e, i) => {
              const fromA = assetById[e.from];
              const toA = assetById[e.to];
              return (
                <div className="row" key={i} style={{ gridTemplateColumns: "2fr 1fr 2fr 2fr 60px" }}>
                  <span>{fromA ? <>{fromA.name} <span className="ip">{fromA.ip}</span></> : <span style={{ color: "var(--danger)" }}>missing asset {e.from}</span>}</span>
                  <span><span className="pill proto">{e.protocol}</span></span>
                  <span>{toA ? <>{toA.name} <span className="ip">{toA.ip}</span></> : <span style={{ color: "var(--danger)" }}>missing asset {e.to}</span>}</span>
                  <span style={{ color: "var(--text-2)", fontSize: 12 }}>{e.note || ""}</span>
                  <button className="iconbtn danger" onClick={() => removeEdge(i)} title="remove">×</button>
                </div>
              );
            })}
          </>
        )}
      </div>
    );
  }

  OT.ui = OT.ui || {};
  OT.ui.StepFlows = StepFlows;
})(window.OT);
