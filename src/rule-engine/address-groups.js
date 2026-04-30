window.OT = window.OT || {};
(function (OT) {
  // Asset.ip may be comma-separated for multi-NIC assets (one logical PLC, multiple IPs).
  function ipsForRoleProtocol(assets, role, protocol) {
    const out = [];
    for (const a of assets) {
      if (!(a.roles || []).some((rp) => rp.role === role && rp.protocol === protocol)) continue;
      for (const ip of String(a.ip).split(",").map((s) => s.trim()).filter(Boolean)) {
        out.push(ip);
      }
    }
    return out;
  }

  function buildSrcExpression(allowedRoles, protocol, assets) {
    if (!allowedRoles || allowedRoles.length === 0) return "$HOME_NET";
    const ips = allowedRoles.flatMap((r) => ipsForRoleProtocol(assets, r, protocol));
    if (ips.length === 0) return "$HOME_NET";
    return "![" + [...new Set(ips)].join(",") + "]";
  }

  function buildDstExpression(targetRoles, protocol, assets) {
    const ips = (targetRoles || []).flatMap((r) => ipsForRoleProtocol(assets, r, protocol));
    if (ips.length === 0) return "$ICS_NET";
    return "[" + [...new Set(ips)].join(",") + "]";
  }

  function addressGroupsForBundle(catalog, assets) {
    const out = {};
    const roleKeys = Object.keys(catalog.roles || {});
    const protoKeys = Object.keys(catalog.protocols || {});
    for (const role of roleKeys) {
      for (const proto of protoKeys) {
        const ips = ipsForRoleProtocol(assets, role, proto);
        if (ips.length > 0) {
          out[role.toUpperCase() + "_" + proto.toUpperCase()] = "[" + [...new Set(ips)].join(",") + "]";
        }
      }
      const allIps = protoKeys.flatMap((p) => ipsForRoleProtocol(assets, role, p));
      if (allIps.length > 0) {
        out[role.toUpperCase()] = "[" + [...new Set(allIps)].join(",") + "]";
      }
    }
    return out;
  }

  OT.addressGroups = { ipsForRoleProtocol, buildSrcExpression, buildDstExpression, addressGroupsForBundle };
})(window.OT);
