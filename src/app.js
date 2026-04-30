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
      </>
    );
  }

  OT.App = App;
  ReactDOM.createRoot(document.getElementById("root")).render(<App />);
})(window.OT);
