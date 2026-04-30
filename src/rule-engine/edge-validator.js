window.OT = window.OT || {};
(function (OT) {
  function validateEdgesAgainstRules(state, rules) {
    const findings = [];
    const assets = state.assets || [];
    const edges = state.edges || [];
    const assetById = Object.fromEntries(assets.map((a) => [a.id, a]));
    const hasRoleProto = (asset, role, proto) =>
      (asset.roles || []).some((rp) => rp.role === role && rp.protocol === proto);

    for (const r of rules) {
      const proto = r.det.protocol;
      const allowedIds = new Set(
        assets
          .filter((a) => (r.det.allowedRoles || []).some((role) => hasRoleProto(a, role, proto)))
          .map((a) => a.id)
      );
      const targetIds = new Set(
        assets
          .filter((a) => (r.det.targetRoles || []).some((role) => hasRoleProto(a, role, proto)))
          .map((a) => a.id)
      );
      for (const e of edges) {
        if (e.protocol !== proto) continue;
        if (!targetIds.has(e.to)) continue;
        if (allowedIds.has(e.from)) continue;
        const fromA = assetById[e.from];
        const toA = assetById[e.to];
        if (!fromA || !toA) continue;
        findings.push({
          sid: r.sid,
          detectionId: r.det.id,
          detectionTitle: r.det.title,
          protocol: proto,
          fromName: fromA.name,
          fromIp: fromA.ip,
          toName: toA.name,
          toIp: toA.ip,
          allowedRoles: r.det.allowedRoles || [],
          note: e.note || "",
        });
      }
    }
    return findings;
  }

  OT.edgeValidator = { validateEdgesAgainstRules };
})(window.OT);
