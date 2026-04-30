window.OT = window.OT || {};
(function (OT) {
  const { useState } = React;

  // Split a single line into fields with proper handling of double-quoted
  // fields (quotes can contain comma/tab; "" inside a quoted field is a literal ").
  function splitCsvLine(line) {
    const out = [];
    let cur = "";
    let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (inQ) {
        if (c === '"') {
          if (line[i + 1] === '"') { cur += '"'; i++; }
          else inQ = false;
        } else cur += c;
      } else {
        if (c === '"') inQ = true;
        else if (c === "," || c === "\t") { out.push(cur); cur = ""; }
        else cur += c;
      }
    }
    out.push(cur);
    return out.map((s) => s.trim());
  }

  // Parse CSV / TSV / paste-from-spreadsheet text into asset rows.
  // Accepted columns (in order): name, ip, type (type optional).
  // Separators: comma or tab. Quoted fields preserve embedded commas/tabs.
  // # comment lines and blank lines are ignored. A first row whose first cell
  // is "name", "asset", "host", or "hostname" is treated as a header.
  function parseAssetText(text) {
    const out = [];
    const errors = [];
    const lines = text.split(/\r?\n/);
    let lineNum = 0;
    let headerSkipped = false;
    for (const raw of lines) {
      lineNum++;
      const line = raw.trim();
      if (!line || line.startsWith("#")) continue;
      const fields = splitCsvLine(line);
      if (!headerSkipped && /^(name|asset|host|hostname)$/i.test(fields[0] || "")) {
        headerSkipped = true;
        continue;
      }
      headerSkipped = true;
      if (fields.length < 2 || !fields[0] || !fields[1]) {
        errors.push("line " + lineNum + ": expected at least name,ip");
        continue;
      }
      out.push({
        id: Math.random().toString(36).slice(2, 10),
        name: fields[0],
        ip: fields[1],
        notes: fields[2] || "",
        roles: [],
      });
    }
    return { rows: out, errors };
  }

  function StepInventory({ state, setState, catalog }) {
    const [name, setName] = useState("");
    const [ip, setIp] = useState("");
    const [filter, setFilter] = useState("");
    const [pasting, setPasting] = useState(false);
    const [pasteText, setPasteText] = useState("");
    const [pasteErrors, setPasteErrors] = useState([]);
    const ROLES = catalog.roles || {};

    const addAsset = () => {
      if (!name.trim() || !ip.trim()) return;
      setState({
        ...state,
        assets: [...state.assets, {
          id: Math.random().toString(36).slice(2, 10),
          name: name.trim(), ip: ip.trim(), notes: "", roles: [],
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

    const doImport = (replace) => {
      const { rows, errors } = parseAssetText(pasteText);
      setPasteErrors(errors);
      if (rows.length === 0) return;
      setState({ ...state, assets: replace ? rows : [...state.assets, ...rows] });
      setPasteText("");
      setPasting(false);
    };

    const importCsvFile = () => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".csv,.tsv,.txt,text/csv,text/tab-separated-values,text/plain";
      input.onchange = (e) => {
        const f = e.target.files[0];
        if (!f) return;
        const reader = new FileReader();
        reader.onload = () => {
          const text = String(reader.result);
          const { rows, errors } = parseAssetText(text);
          setPasteErrors(errors);
          if (rows.length === 0) {
            alert(
              "no rows parsed from " + f.name +
              (errors.length > 0 ? " (" + errors.length + " parse error(s); open paste/csv import to see them)" : "")
            );
            if (errors.length > 0) setPasting(true);
            return;
          }
          setState({ ...state, assets: [...state.assets, ...rows] });
        };
        reader.readAsText(f);
      };
      input.click();
    };

    const loadExample = async () => {
      try {
        const res = await fetch("./examples/inventory-example.csv");
        if (!res.ok) throw new Error("HTTP " + res.status);
        const text = await res.text();
        setPasteText(text);
        setPasting(true);
        setPasteErrors([]);
      } catch (err) {
        alert("could not load example csv: " + err.message);
      }
    };

    const downloadCsv = () => {
      const header = "name,ip,notes";
      const lines = state.assets.map((a) => [a.name, a.ip, a.notes || a.type || ""].map((s) => /[,"\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s).join(","));
      const csv = [header, ...lines].join("\n");
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = (state.siteName || "inventory") + ".csv";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    };

    return (
      <div className="panel">
        <h2>inventory</h2>
        <p className="lead">add assets that should be on the wire. paste from a spreadsheet (csv or tsv) or type one at a time. roles are configured in step 2.</p>
        <div className="toolbar">
          <input
            placeholder="asset name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") addAsset(); }}
          />
          <input
            placeholder="IP (multi-NIC: 10.0.0.1,10.0.0.2)"
            value={ip}
            onChange={(e) => setIp(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") addAsset(); }}
            style={{ maxWidth: 320 }}
          />
          <button className="primary" onClick={addAsset}>+ add</button>
          <button onClick={() => { setPasting(!pasting); setPasteErrors([]); }}>
            {pasting ? "cancel paste" : "paste / csv import"}
          </button>
          <button onClick={importCsvFile}>import csv file</button>
          {state.assets.length > 0 ? (
            <button onClick={downloadCsv} title="export current inventory as csv">export csv</button>
          ) : null}
          <span style={{ flex: 1 }} />
          <input
            placeholder="filter..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            style={{ maxWidth: 200 }}
          />
        </div>

        {pasting ? (
          <div style={{ marginBottom: 16, padding: 12, background: "var(--surface-2)", borderRadius: 8 }}>
            <div style={{ fontSize: 12, color: "var(--text-2)", marginBottom: 6 }}>
              paste rows from a spreadsheet, or csv. one asset per line. format: <code>name,ip[,notes]</code> (comma or tab separated). header row optional. <code>#</code> comments ok. notes is a free-form field; the tool does not interpret it. multi-NIC: quote the IP field, e.g. <code>node-1,"10.20.0.3,10.20.0.7",rack-A</code>.
              {" "}<a href="#" onClick={(e) => { e.preventDefault(); loadExample(); }}>load example csv</a>
            </div>
            <textarea
              rows={6}
              placeholder={"name,ip,type\nPLC-North,10.20.0.5,PLC\nHMI-Main,10.20.0.244,HMI"}
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              style={{ marginBottom: 8 }}
            />
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <button className="primary" onClick={() => doImport(false)} disabled={!pasteText.trim()}>append to inventory</button>
              <button onClick={() => doImport(true)} disabled={!pasteText.trim()}>replace inventory</button>
              <span style={{ flex: 1 }} />
              {pasteErrors.length > 0 ? (
                <span style={{ fontSize: 12, color: "var(--danger)" }}>{pasteErrors.length} parse error(s); see below</span>
              ) : null}
            </div>
            {pasteErrors.length > 0 ? (
              <div style={{ marginTop: 8, fontSize: 12, color: "var(--danger)" }}>
                {pasteErrors.map((e, i) => <div key={i}>{e}</div>)}
              </div>
            ) : null}
          </div>
        ) : null}

        {state.assets.length === 0 ? (
          <div className="empty">no assets yet. add one above, paste a csv, or import an asset-model.json.</div>
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
