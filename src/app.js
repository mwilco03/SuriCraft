// requires: OT.state, OT.catalog, OT.suricataEmitter, OT.ui (all step components + Stepper + NavButtons)
window.OT = window.OT || {};
(function (OT) {
  const { useState, useEffect, useMemo } = React;
  const { loadState, saveState, clearState, defaultState } = OT.state;
  const { loadCatalog } = OT.catalog;
  const { generateRules } = OT.suricataEmitter;
  const { Stepper, NavButtons, STEPS, StepInventory, StepRoles, StepFlows, StepDetections, StepReview, StepExport } = OT.ui;

  function App() {
    const [catalog, setCatalog] = useState(null);
    const [catalogError, setCatalogError] = useState(null);
    const [state, setStateRaw] = useState(null);

    useEffect(() => {
      loadCatalog().then((c) => {
        setCatalog(c);
        setStateRaw(loadState(c));
      }).catch((err) => setCatalogError(err.message));
    }, []);

    if (catalogError) {
      return (
        <div className="panel">
          <h2 style={{ color: "var(--danger)" }}>catalog load failed</h2>
          <pre className="rule">{catalogError}</pre>
          <p className="lead">edit catalog/default-detections.json and reload.</p>
        </div>
      );
    }
    if (!catalog || !state) {
      return <div className="empty">loading catalog...</div>;
    }

    const setState = (s) => { setStateRaw(s); saveState(s); };
    const setStep = (n) => setState({ ...state, step: n });
    const rules = generateRules(state, catalog);

    const reset = () => {
      if (!confirm("clear all assets, settings, and detections?")) return;
      clearState();
      setStateRaw(defaultState(catalog));
    };

    const importJson = () => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "application/json";
      input.onchange = (e) => {
        const f = e.target.files[0];
        if (!f) return;
        const reader = new FileReader();
        reader.onload = () => {
          try {
            const data = JSON.parse(reader.result);
            setState({
              ...state,
              siteName: data.site || state.siteName,
              diagramRev: data.diagramRev || state.diagramRev,
              sidBase: data.sidBase || state.sidBase,
              assets: data.assets || [],
              edges: data.edges || [],
              detectionsOn: { ...state.detectionsOn, ...(data.detectionsOn || {}) },
              commentOverrides: data.commentOverrides || {},
            });
          } catch (err) {
            alert("invalid asset-model.json: " + err.message);
          }
        };
        reader.readAsText(f);
      };
      input.click();
    };

    const stepProps = { state, setState, catalog };
    const StepView = [StepInventory, StepRoles, StepFlows, StepDetections, StepReview, StepExport][state.step];

    // Auto-derive GitHub URLs from github.io hosting; fall back to canonical repo for local dev.
    const ghBase = (() => {
      const host = window.location.hostname || "";
      const m = host.match(/^([^.]+)\.github\.io$/);
      if (m) {
        const user = m[1];
        const path = window.location.pathname.split("/").filter(Boolean);
        const repo = path[0] || "SuriCraft";
        return "https://github.com/" + user + "/" + repo;
      }
      return "https://github.com/mwilco03/SuriCraft";
    })();
    const issuesUrl = ghBase + "/issues";
    const docsBase = ghBase + "/blob/main/docs";

    return (
      <>
        <header>
          <h1>SuriCraft</h1>
          <span className="sub">OT detection authoring · Suricata rules for any install</span>
          <span className="right">
            <input
              value={state.siteName}
              onChange={(e) => setState({ ...state, siteName: e.target.value })}
              style={{ maxWidth: 140 }}
              title="site name"
            />
            <input
              value={state.diagramRev}
              onChange={(e) => setState({ ...state, diagramRev: e.target.value })}
              style={{ maxWidth: 80 }}
              title="diagram revision"
            />
            <button onClick={importJson}>import</button>
            <button className="danger" onClick={reset}>reset</button>
            <a href={issuesUrl} target="_blank" rel="noopener noreferrer"
               style={{ fontSize: 12, marginLeft: 6, alignSelf: "center" }}>
              report issue
            </a>
          </span>
        </header>
        <Stepper
          step={state.step}
          setStep={setStep}
          assetCount={state.assets.length}
          edgeCount={(state.edges || []).length}
          ruleCount={rules.length}
        />
        <StepView {...stepProps} />
        <NavButtons step={state.step} setStep={setStep} last={STEPS.length - 1} />
        <footer style={{
          marginTop: 32,
          paddingTop: 16,
          borderTop: "0.5px solid var(--border)",
          fontSize: 12,
          color: "var(--text-2)",
          display: "flex",
          gap: 16,
          flexWrap: "wrap",
        }}>
          <a href={docsBase + "/how-this-works.md"} target="_blank" rel="noopener noreferrer">
            how this works
          </a>
          <a href={docsBase + "/suricata-deployment.md"} target="_blank" rel="noopener noreferrer">
            deployment guide
          </a>
          <a href={docsBase + "/catalog-schema.md"} target="_blank" rel="noopener noreferrer">
            catalog schema
          </a>
          <a href={docsBase + "/known-limitations.md"} target="_blank" rel="noopener noreferrer">
            known limitations
          </a>
          <a href={docsBase + "/roadmap.md"} target="_blank" rel="noopener noreferrer">
            roadmap
          </a>
          <span style={{ flex: 1 }} />
          <a href={issuesUrl} target="_blank" rel="noopener noreferrer">report issue</a>
          <a href={ghBase} target="_blank" rel="noopener noreferrer">source</a>
        </footer>
      </>
    );
  }

  OT.App = App;
  ReactDOM.createRoot(document.getElementById("root")).render(<App />);
})(window.OT);
