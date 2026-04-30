window.OT = window.OT || {};
(function (OT) {
  const { useState } = React;

  function StepRoles({ state, setState, catalog }) {
    const ROLES = catalog.roles || {};
    const PROTOCOLS = catalog.protocols || {};
    const STUBS = catalog.stubs || {};
    const protoOptions = [
      ...Object.entries(PROTOCOLS).map(([k, p]) => ({ value: k, label: p.label.split(" ")[0] })),
      ...Object.entries(STUBS).map(([k, s]) => ({ value: k, label: s.label + " (no rules)" })),
    ];
    const firstRole = Object.keys(ROLES)[0] || "allowed_hmi";
    const firstProto = Object.keys(PROTOCOLS)[0] || "modbus";

    const [selectedIds, setSelectedIds] = useState(() => new Set());
    const [bulkRole, setBulkRole] = useState(firstRole);
    const [bulkProto, setBulkProto] = useState(firstProto);

    const updateAssetRoles = (id, roles) =>
      setState({ ...state, assets: state.assets.map((a) => (a.id === id ? { ...a, roles } : a)) });

    const toggleSelected = (id) => {
      const s = new Set(selectedIds);
      if (s.has(id)) s.delete(id); else s.add(id);
      setSelectedIds(s);
    };
    const selectAll = () => setSelectedIds(new Set(state.assets.map((a) => a.id)));
    const selectNone = () => setSelectedIds(new Set());
    const allSelected = state.assets.length > 0 && selectedIds.size === state.assets.length;

    const applyBulk = () => {
      if (selectedIds.size === 0) return;
      const pair = { role: bulkRole, protocol: bulkProto };
      setState({
        ...state,
        assets: state.assets.map((a) => {
          if (!selectedIds.has(a.id)) return a;
          const roles = a.roles || [];
          if (roles.some((rp) => rp.role === pair.role && rp.protocol === pair.protocol)) return a;
          return { ...a, roles: [...roles, pair] };
        }),
      });
    };
    const removeBulk = () => {
      if (selectedIds.size === 0) return;
      setState({
        ...state,
        assets: state.assets.map((a) => {
          if (!selectedIds.has(a.id)) return a;
          return {
            ...a,
            roles: (a.roles || []).filter((rp) => !(rp.role === bulkRole && rp.protocol === bulkProto)),
          };
        }),
      });
    };

    if (state.assets.length === 0) {
      return <div className="panel"><div className="empty">no assets to tag. go back to step 1.</div></div>;
    }

    const cols = "30px 1.3fr 1fr 1.8fr 80px";

    return (
      <div className="panel">
        <h2>roles per protocol</h2>
        <p className="lead">an asset can hold multiple (role, protocol) pairs. use the checkboxes + bulk controls to tag many assets at once.</p>

        <div className="toolbar" style={{ borderBottom: "0.5px solid var(--border)", paddingBottom: 10, marginBottom: 8 }}>
          <button onClick={allSelected ? selectNone : selectAll}>
            {allSelected ? "clear all" : "select all"}
          </button>
          <span style={{ fontSize: 12, color: "var(--text-2)" }}>
            {selectedIds.size} selected
          </span>
          <span style={{ color: "var(--text-3)" }}>|</span>
          <span style={{ fontSize: 12, color: "var(--text-2)" }}>bulk:</span>
          <select value={bulkRole} onChange={(e) => setBulkRole(e.target.value)} style={{ maxWidth: 180 }}>
            {Object.entries(ROLES).map(([k, r]) => (
              <option key={k} value={k}>{r.label}</option>
            ))}
          </select>
          <select value={bulkProto} onChange={(e) => setBulkProto(e.target.value)} style={{ maxWidth: 200 }}>
            {protoOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <button className="primary" onClick={applyBulk} disabled={selectedIds.size === 0}>+ apply</button>
          <button onClick={removeBulk} disabled={selectedIds.size === 0}>− remove</button>
        </div>

        <div className="grid-asset head" style={{ gridTemplateColumns: cols }}>
          <span></span><span>asset</span><span>IP</span><span>roles · protocol</span><span></span>
        </div>
        {state.assets.map((a) => {
          const roles = a.roles || [];
          const checked = selectedIds.has(a.id);
          return (
            <div className="grid-asset" key={a.id} style={{ gridTemplateColumns: cols }}>
              <span style={{ display: "flex", alignItems: "center" }}>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleSelected(a.id)}
                  style={{ width: "auto", margin: 0 }}
                />
              </span>
              <span style={{ fontWeight: 500 }}>{a.name}</span>
              <span className="ip">{a.ip}</span>
              <div>
                {roles.length === 0 ? (
                  <span style={{ color: "var(--text-3)", fontSize: 12, fontStyle: "italic" }}>no roles assigned</span>
                ) : null}
                {roles.map((rp, i) => (
                  <div className="role-pair" key={i}>
                    <select
                      value={rp.role}
                      onChange={(e) => {
                        const newRoles = [...roles];
                        newRoles[i] = { ...rp, role: e.target.value };
                        updateAssetRoles(a.id, newRoles);
                      }}
                    >
                      {Object.entries(ROLES).map(([k, r]) => (
                        <option key={k} value={k}>{r.label}</option>
                      ))}
                    </select>
                    <span style={{ color: "var(--text-2)", fontSize: 12 }}>·</span>
                    <select
                      value={rp.protocol}
                      onChange={(e) => {
                        const newRoles = [...roles];
                        newRoles[i] = { ...rp, protocol: e.target.value };
                        updateAssetRoles(a.id, newRoles);
                      }}
                      style={{ maxWidth: 180 }}
                    >
                      {protoOptions.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                    <button onClick={() => updateAssetRoles(a.id, roles.filter((_, j) => j !== i))} title="remove">×</button>
                  </div>
                ))}
                <button
                  className="role-add"
                  onClick={() => updateAssetRoles(a.id, [...roles, { role: firstRole, protocol: firstProto }])}
                >
                  + add role
                </button>
              </div>
              <span></span>
            </div>
          );
        })}
      </div>
    );
  }

  OT.ui = OT.ui || {};
  OT.ui.StepRoles = StepRoles;
})(window.OT);
