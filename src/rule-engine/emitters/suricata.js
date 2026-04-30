// requires: OT.addressGroups
window.OT = window.OT || {};
(function (OT) {
  const { buildSrcExpression, buildDstExpression } = OT.addressGroups;

  function commonOptions(d, sid, diagramRev, severities) {
    const sev = (severities && severities[d.severity]) || { classtype: "attempted-admin" };
    const isHex = d.protocol === "enip" || d.protocol === "s7comm" || d.protocol === "srtp";
    const funcStr = isHex
      ? "0x" + d.func.toString(16).padStart(2, "0").toUpperCase()
      : d.func;
    const meta = [
      "ics_protocol " + d.protocol,
      "ics_opclass " + d.opclass,
      "ics_func " + funcStr,
      ...(d.critical ? ["ics_severity critical"] : []),
      "ics_diagram_rev " + diagramRev,
    ];
    return [
      "flow:to_server,established",
      "classtype:" + sev.classtype,
      "sid:" + sid,
      "rev:1",
      "metadata:" + meta.join(", "),
    ].join("; ");
  }

  function renderModbus(d, sid, src, dst, siteName, diagramRev, ctx) {
    const port = ctx.protocols.modbus.port;
    return (
      "alert tcp " + src + " any -> " + dst + " " + port + " ( " +
      'msg:"' + siteName + " [MODBUS] " + d.opclass + ": " + d.title.replace(/^Modbus /, "") + '"; ' +
      "modbus:function " + d.func + "; " +
      commonOptions(d, sid, diagramRev, ctx.severities) + ";)"
    );
  }

  function renderDnp3(d, sid, src, dst, siteName, diagramRev, ctx) {
    const port = ctx.protocols.dnp3.port;
    return (
      "alert tcp " + src + " any -> " + dst + " " + port + " ( " +
      'msg:"' + siteName + " [DNP3] " + d.opclass + ": " + d.title.replace(/^DNP3 /, "") + '"; ' +
      "dnp3_func:" + d.func + "; " +
      commonOptions(d, sid, diagramRev, ctx.severities) + ";)"
    );
  }

  function renderEnip(d, sid, src, dst, siteName, diagramRev, ctx) {
    const port = ctx.protocols.enip.port;
    return (
      "alert tcp " + src + " any -> " + dst + " " + port + " ( " +
      'msg:"' + siteName + " [CIP] " + d.opclass + ": " + d.title.replace(/^CIP /, "") + '"; ' +
      "cip_service:" + d.decFunc + "; " +
      commonOptions(d, sid, diagramRev, ctx.severities) + ";)"
    );
  }

  function renderS7classic(d, sid, src, dst, siteName, diagramRev, ctx) {
    const port = ctx.protocols.s7comm.port;
    const fnHex = d.func.toString(16).padStart(2, "0").toLowerCase();
    return (
      "alert tcp " + src + " any -> " + dst + " " + port + " ( " +
      'msg:"' + siteName + " [S7COMM] " + d.opclass + ": " + d.title.replace(/^S7Comm /, "") + '"; ' +
      'content:"|03 00|"; offset:0; depth:2; ' +
      'content:"|32 01|"; distance:0; within:30; ' +
      'content:"|' + fnHex + '|"; distance:8; within:1; ' +
      commonOptions(d, sid, diagramRev, ctx.severities) + ";)"
    );
  }

  function renderSrtp(d, sid, src, dst, siteName, diagramRev, ctx) {
    // GE-SRTP messages are a fixed 56 bytes. Service request code lives at
    // byte offset 42 (Denton et al. 2017). Anchor: 0x02 at offset 0,
    // dsize 56, service code at offset 42.
    const port = ctx.protocols.srtp.port;
    const fnHex = d.func.toString(16).padStart(2, "0").toLowerCase();
    return (
      "alert tcp " + src + " any -> " + dst + " " + port + " ( " +
      'msg:"' + siteName + " [SRTP] " + d.opclass + ": " + d.title.replace(/^GE-SRTP /, "") + '"; ' +
      "dsize:56; " +
      'content:"|02|"; offset:0; depth:1; ' +
      'content:"|' + fnHex + '|"; offset:42; depth:1; ' +
      commonOptions(d, sid, diagramRev, ctx.severities) + ";)"
    );
  }

  const RENDERERS = {
    modbus: renderModbus,
    dnp3: renderDnp3,
    enip: renderEnip,
    s7comm: renderS7classic,
    srtp: renderSrtp,
  };

  function generateRules(state, catalog) {
    const detections = catalog.detections || [];
    const protocols = catalog.protocols || {};
    const enabled = detections.filter((d) => state.detectionsOn[d.id]);
    const byProto = {};
    for (const d of enabled) {
      if (!byProto[d.protocol]) byProto[d.protocol] = [];
      byProto[d.protocol].push(d);
    }
    const out = [];
    for (const proto of Object.keys(protocols)) {
      const list = byProto[proto] || [];
      list.sort((a, b) => (a.opclass + a.func).localeCompare(b.opclass + b.func));
      list.forEach((d, i) => {
        const sid = protocols[proto].sidBase + i + 1;
        const src = buildSrcExpression(d.allowedRoles, proto, state.assets);
        const dst = buildDstExpression(d.targetRoles, proto, state.assets);
        const renderer = RENDERERS[proto];
        if (!renderer) return;
        const commentLines = state.commentOverrides[d.id] || d.comment;
        const commentText = commentLines.map((l) => "# " + l).join("\n");
        const ctx = { protocols, severities: catalog.severities };
        const ruleText = renderer(d, sid, src, dst, state.siteName, state.diagramRev, ctx);
        out.push({ id: d.id, sid, src, dst, comment: commentText, rule: ruleText, det: d });
      });
    }
    return out;
  }

  OT.suricataEmitter = { RENDERERS, generateRules };
})(window.OT);
