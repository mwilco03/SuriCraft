window.OT = window.OT || {};
(function (OT) {
  const { useState } = React;

  function StepInventory({ state, setState, catalog }) {
    const [name, setName] = useState("");
    const [ip, setIp] = useState("");
    const [filter, setFilter] = useState("");
    const ROLES = catalog.roles || {};

    const addAsset = () => {
      if (!name.trim() || !ip.trim()) return;
      setState({
        ...state,
        assets: [...state.assets, {
          id: Math.random().toString(36).slice(2, 10),
          name: name.trim(), ip: ip.trim(), type: "", roles: [],
        }],
      });
      setName("");
      setIp("");
    };
    const removeAsset = (id) => setState({ ...state, assets: state.assets.filter((a) => a.id !== id) });
    const updateField = (id, field, value) =>
      setState({ ...state, assets: state.assets.map((a) => (a.id === id ? { ...a, [field]: value } : a)) });
    const visible = state.assets.filter(
      (a) => !filter || a.name.toLowerCase().includes(filter.toLowerCase()) || a.ip.includes(filter)
    );

    return (
      <div className="panel">
        <h2>inventory</h2>
        <p className="lead">add assets that should be on the wire. roles are configured in step 2.</p>
        <div className="toolbar">
          <input
            placeholder="asset name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") addAsset(); }}
          />
          <input
            placeholder="IP (or 1.1.1.1,1.1.1.2)"
            value={ip}
            onChange={(e) => setIp(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") addAsset(); }}
            style={{ maxWidth: 220 }}
          />
          <button className="primary" onClick={addAsset}>+ add</button>
          <span style={{ flex: 1 }} />
          <input
            placeholder="filter..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            style={{ maxWidth: 200 }}
          />
        </div>
        {state.assets.length === 0 ? (
          <div className="empty">no assets yet. add one above, or import an asset-model.json.</div>
        ) : (
          <>
            <div className="row head" style={{ gridTemplateColumns: "1fr 1fr 1.5fr 60px" }}>
              <span>name</span><span>IP</span><span>roles (set in step 2)</span><span></span>
            </div>
            {visible.map((a) => (
              <div className="row" key={a.id} style={{ gridTemplateColumns: "1fr 1fr 1.5fr 60px" }}>
                <input value={a.name} onChange={(e) => updateField(a.id, "name", e.target.value)} />
                <input
                  value={a.ip}
                  onChange={(e) => updateField(a.id, "ip", e.target.value)}
                  style={{ fontFamily: "var(--mono)" }}
                />
                <span>
                  {(a.roles || []).length === 0 ? (
                    <span style={{ color: "var(--text-3)", fontStyle: "italic" }}>no roles</span>
                  ) : (
                    a.roles.map((rp, i) => (
                      <span key={i} className={"pill " + (ROLES[rp.role]?.pill || "")}>
                        {ROLES[rp.role]?.label} <span style={{ opacity: 0.6 }}>· {rp.protocol}</span>
                      </span>
                    ))
                  )}
                </span>
                <button className="iconbtn danger" onClick={() => removeAsset(a.id)} title="remove">×</button>
              </div>
            ))}
          </>
        )}
      </div>
    );
  }

  OT.ui = OT.ui || {};
  OT.ui.StepInventory = StepInventory;
})(window.OT);
