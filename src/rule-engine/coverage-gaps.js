// requires: OT.addressGroups
window.OT = window.OT || {};
(function (OT) {
  const { ipsForRoleProtocol } = OT.addressGroups;

  function computeCoverageGaps(state, catalog) {
    const gaps = [];
    const assets = state.assets || [];
    const hasRoleProto = (role, proto) =>
      assets.some((a) => (a.roles || []).some((rp) => rp.role === role && rp.protocol === proto));

    if (hasRoleProto("target_plc_s7_plus", "s7plus")) {
      const ips = ipsForRoleProtocol(assets, "target_plc_s7_plus", "s7plus");
      gaps.push({
        title: "S7CommPlus targets present (no Suricata coverage)",
        detail:
          ips.length +
          " S7-1200/1500 controller(s): " + ips.join(", ") + ". " +
          "Suricata cannot inspect S7CommPlus PDU bodies (encrypted). " +
          "Deploy Zeek with icsnpp-s7comm on the same SPAN to cover these.",
      });
    }
    if (assets.some((a) => (a.roles || []).some((rp) => rp.protocol === "srtp"))) {
      gaps.push({
        title: "GE-SRTP coverage is byte-rules only",
        detail:
          "SRTP rules anchor on byte 42 service code in 56-byte messages. " +
          "No protocol-aware parsing means no exception/error correlation, " +
          "no sub-command parsing, and no protection against fragmented or " +
          "non-standard message lengths.",
      });
    }
    if (assets.some((a) => /profinet/i.test(a.name) || /profinet/i.test(a.notes || a.type || ""))) {
      gaps.push({
        title: "PROFINET I/O modules present (L2 multicast, invisible to Suricata)",
        detail:
          "PROFINET DCP and RT use EtherType 0x8892 L2 multicast. Suricata at " +
          "any L3 SPAN sensor sees zero PROFINET traffic. Use Zeek with " +
          "icsnpp-profinet-io-cm on a TAP that preserves L2.",
      });
    }
    if (
      state.detectionsOn["modbus_w_5"] || state.detectionsOn["modbus_w_6"] ||
      state.detectionsOn["modbus_w_15"] || state.detectionsOn["modbus_w_16"] ||
      state.detectionsOn["modbus_w_22"] || state.detectionsOn["modbus_w_23"]
    ) {
      gaps.push({
        title: "Modbus stream-depth requirement",
        detail:
          "stream.reassembly.depth must be 0 in suricata.yaml (or via the include " +
          "overlay shipped in this bundle). Default 1MB causes silent rule failure " +
          "within hours on long-lived Modbus flows.",
      });
    }
    if (hasRoleProto("target_plc_logix", "enip")) {
      gaps.push({
        title: "CIP cyclic I/O (UDP/2222) not covered",
        detail:
          "Class 1 cyclic I/O messaging is not in scope for these explicit-" +
          "message rules. Use Zeek icsnpp-enip plus a cadence-anomaly script.",
      });
    }

    // Stub-protocol gaps: any asset role tagged with a stub protocol triggers the stub note.
    const stubs = (catalog && catalog.stubs) || {};
    for (const stubKey of Object.keys(stubs)) {
      const present = assets.some((a) => (a.roles || []).some((rp) => rp.protocol === stubKey));
      if (!present) continue;
      const stub = stubs[stubKey];
      gaps.push({
        title: stub.label + " present (no Suricata rules in v1)",
        detail: stub.note || "Stub protocol; no rule coverage in v1.",
      });
    }
    return gaps;
  }

  OT.coverageGaps = { computeCoverageGaps };
})(window.OT);
