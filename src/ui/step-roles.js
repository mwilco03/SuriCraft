// Step 2: access per protocol.
// UI is "for each protocol, who is allowed to do what to whom."
// Storage stays as asset.roles = [{role, protocol}, ...] for backward compat
// with previously-exported asset-model.json files. The category model below
// is a presentation-time view over that storage.
window.OT = window.OT || {};
(function (OT) {
  const { useState, useMemo } = React;

  // Map a catalog role name to one of four access categories.
  function roleToCategory(role) {
    if (!role) return null;
    if (role.startsWith("target_")) return "target";
    if (role === "allowed_eng") return "engineering";
    if (role === "allowed_plc_peer") return "peer";
    // operator covers HMI, IO server, and ICCP gateway — anything where
    // routine read/write traffic to a target is part of the normal workload.
    if (role === "allowed_hmi" || role === "allowed_ioserver" || role === "allowed_iccp") return "operator";
    return null;
  }

  // The canonical role we WRITE when a user adds an asset to a category.
  // Existing assets may carry other roles in the same category (e.g. an
  // imported model with allowed_ioserver) and those continue to match
  // because the catalog's allowedRoles list still includes them.
  function canonicalRoleForCategory(category, protocol, catalog) {
    if (category === "target") {
      // Per-protocol target role. Read from catalog; fall back by protocol.
      const detections = (catalog.detections || []).filter((d) => d.protocol === protocol);
      for (const d of detections) {
        for (const r of d.targetRoles || []) {
          if (r && r.startsWith("target_")) return r;
        }
      }
      // Fallback map for protocols that don't have detections yet (e.g. s7plus).
      const fallback = {
        modbus: "target_modbus_server",
        dnp3: "target_rtu",
        s7comm: "target_plc_s7_classic",
        s7plus: "target_plc_s7_plus",
        enip: "target_plc_logix",
        srtp: "target_plc_ge",
      };
      return fallback[protocol] || "target_modbus_server";
    }
    if (category === "engineering") return "allowed_eng";
    if (category === "peer") return "allowed_plc_peer";
    if (category === "operator") return "allowed_hmi";
    return null;
  }

  // Categories that are actually referenced by detections for this protocol.
  // Always include "target". Allow-list categories appear if any detection
  // for this protocol references a role that maps to that category.
  function categoriesForProtocol(catalog, protocol) {
    const cats = new Set(["target"]);
    const detections = (catalog.detections || []).filter((d) => d.protocol === protocol);
    for (const d of detections) {
      for (const r of d.allowedRoles || []) {
        const cat = roleToCategory(r);
        if (cat) cats.add(cat);
      }
    }
    // If the protocol has no detections (e.g. s7plus stub-like) we still
    // want users to be able to mark targets so coverage-gaps fires.
    return Array.from(cats);
  }

  function isAssetInCategory(asset, protocol, category) {
    return (asset.roles || []).some(
      (rp) => rp.protocol === protocol && roleToCategory(rp.role) === category
    );
  }

  const CATEGORY_LABELS = {
    target: "targets",
    operator: "operator allow-list",
    engineering: "engineering allow-list",
    peer: "peer allow-list",
  };
  const CATEGORY_HELP = {
    target: "destinations the rules apply to",
    operator: "HMIs, IO servers — sources doing routine read/write ops; their traffic is not alerted on",
    engineering: "engineering workstations, programming tools — sources doing diagnostics and configuration",
    peer: "other PLCs / I/O servers — legitimate device-to-device traffic (only some protocols)",
  };

  function StepAccess({ state, setState, catalog }) {
    const [filter, setFilter] = useState("");
    const PROTOCOLS = catalog.protocols || {};
    const STUBS = catalog.stubs || {};

    const protocolKeys = useMemo(() => {
      // Show every native protocol (has detections) and every stub. Order:
      // catalog protocol order first, then stubs.
      return [...Object.keys(PROTOCOLS), ...Object.keys(STUBS)];
    }, [catalog]);

    const setAssetCategory = (assetId, protocol, category, isIn) => {
      const updated = state.assets.map((a) => {
        if (a.id !== assetId) return a;
        const existing = a.roles || [];
        // Strip every role-pair on this protocol whose role maps to this category.
        const stripped = existing.filter(
          (rp) => !(rp.protocol === protocol && roleToCategory(rp.role) === category)
        );
        if (!isIn) return { ...a, roles: stripped };
        const canonical = canonicalRoleForCategory(category, protocol, catalog);
        return { ...a, roles: [...stripped, { role: canonical, protocol }] };
      });
      setState({ ...state, assets: updated });
    };

    if (state.assets.length === 0) {
      return (
        <div className="panel">
          <div className="empty">no assets to assign access for. go back to step 1.</div>
        </div>
      );
    }

    const visibleAssets = filter
      ? state.assets.filter(
          (a) => a.name.toLowerCase().includes(filter.toLowerCase()) || a.ip.includes(filter)
        )
      : state.assets;

    return (
      <div className="panel">
        <h2>access per protocol</h2>
        <p className="lead">
          for each protocol on your wire, pick which assets are <b>targets</b> (rules will apply to them) and which assets are in each <b>allow-list</b> (their traffic is excluded from alerts). same asset can play different roles in different protocols.
        </p>
        <div className="toolbar" style={{ borderBottom: "0.5px solid var(--border)", paddingBottom: 10, marginBottom: 12 }}>
          <input
            placeholder="filter assets by name or IP..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            style={{ maxWidth: 320 }}
          />
          <span style={{ flex: 1 }} />
          <span style={{ fontSize: 12, color: "var(--text-2)" }}>
            {state.assets.length} asset(s); {visibleAssets.length} visible
          </span>
        </div>

        {protocolKeys.map((proto) => {
          const isStub = !PROTOCOLS[proto] && STUBS[proto];
          const meta = PROTOCOLS[proto] || STUBS[proto];
          const cats = isStub ? ["target"] : categoriesForProtocol(catalog, proto);
          const counts = Object.fromEntries(
            cats.map((c) => [
              c,
              state.assets.filter((a) => isAssetInCategory(a, proto, c)).length,
            ])
          );
          const totalAssigned = Object.values(counts).reduce((s, n) => s + n, 0);
          const portStr = meta.port ? " · port " + meta.port : "";
          return (
            <details key={proto} open={totalAssigned > 0 || protocolKeys.length <= 4}>
              <summary>
                <span style={{ fontWeight: 500, color: "var(--text)" }}>{meta.label || proto}</span>
                <span style={{ color: "var(--text-2)", marginLeft: 8, fontSize: 12 }}>{portStr}</span>
                {isStub ? (
                  <span className="pill warn" style={{ marginLeft: 8 }}>no rules in v1</span>
                ) : null}
                <span style={{ color: "var(--text-2)", marginLeft: 8, fontSize: 12 }}>
                  {cats.map((c) => counts[c] + " " + CATEGORY_LABELS[c].split(" ")[0]).join(" · ")}
                </span>
              </summary>
              <div style={{ marginTop: 12, marginBottom: 16 }}>
                {isStub ? (
                  <div style={{ fontSize: 12, color: "var(--text-2)", marginBottom: 8, padding: "8px 10px", background: "var(--surface-2)", borderRadius: 6 }}>
                    {meta.note || "Stub protocol; tagging assets here only triggers a coverage-gap entry — no rules will be generated."}
                  </div>
                ) : null}
                {cats.map((cat) => (
                  <div key={cat} style={{ marginBottom: 14 }}>
                    <div style={{ fontWeight: 500, fontSize: 13, marginBottom: 2 }}>
                      {CATEGORY_LABELS[cat]}
                      <span style={{ color: "var(--text-2)", fontWeight: 400, marginLeft: 6, fontSize: 12 }}>
                        ({counts[cat]} selected)
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text-2)", marginBottom: 6 }}>
                      {CATEGORY_HELP[cat]}
                    </div>
                    <div style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
                      gap: "4px 16px",
                      padding: "8px 10px",
                      background: "var(--surface-2)",
                      borderRadius: 6,
                    }}>
                      {visibleAssets.map((a) => {
                        const checked = isAssetInCategory(a, proto, cat);
                        return (
                          <label
                            key={a.id}
                            style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, cursor: "pointer", padding: "2px 0", width: "auto" }}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) => setAssetCategory(a.id, proto, cat, e.target.checked)}
                              style={{ width: "auto", margin: 0 }}
                            />
                            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {a.name} <span className="ip" style={{ fontSize: 11 }}>{a.ip}</span>
                            </span>
                          </label>
                        );
                      })}
                      {visibleAssets.length === 0 ? (
                        <span style={{ fontSize: 12, color: "var(--text-3)", fontStyle: "italic" }}>
                          no assets match the filter
                        </span>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </details>
          );
        })}
      </div>
    );
  }

  OT.ui = OT.ui || {};
  OT.ui.StepRoles = StepAccess;
})(window.OT);
