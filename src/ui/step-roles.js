window.OT = window.OT || {};
(function (OT) {
  function StepRoles({ state, setState, catalog }) {
    const ROLES = catalog.roles || {};
    const PROTOCOLS = catalog.protocols || {};
    const STUBS = catalog.stubs || {};
    const protoOptions = [
      ...Object.entries(PROTOCOLS).map(([k, p]) => ({ value: k, label: p.label.split(" ")[0] })),
      ...Object.entries(STUBS).map(([k, s]) => ({ value: k, label: s.label + " (no rules)" })),
    ];

    const updateAssetRoles = (id, roles) =>
      setState({ ...state, assets: state.assets.map((a) => (a.id === id ? { ...a, roles } : a)) });

    if (state.assets.length === 0) {
      return <div className="panel"><div className="empty">no assets to tag. go back to step 1.</div></div>;
    }

    return (
      <div className="panel">
        <h2>roles per protocol</h2>
        <p className="lead">an asset can hold multiple (role, protocol) pairs. one host that speaks Modbus, S7Comm, and SRTP gets three (role, protocol) entries on the same IP.</p>
        <div className="grid-asset head">
          <span>asset</span><span>IP</span><span>roles · protocol</span><span></span>
        </div>
        {state.assets.map((a) => {
          const roles = a.roles || [];
          return (
            <div className="grid-asset" key={a.id}>
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
                  onClick={() => {
                    const firstRole = Object.keys(ROLES)[0] || "allowed_hmi";
                    const firstProto = Object.keys(PROTOCOLS)[0] || "modbus";
                    updateAssetRoles(a.id, [...roles, { role: firstRole, protocol: firstProto }]);
                  }}
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
