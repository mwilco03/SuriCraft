window.OT = window.OT || {};
(function (OT) {
  const STEPS = [
    { id: 0, label: "inventory" },
    { id: 1, label: "roles" },
    { id: 2, label: "flows" },
    { id: 3, label: "detections" },
    { id: 4, label: "review" },
    { id: 5, label: "export" },
  ];

  function Stepper({ step, setStep, assetCount, edgeCount, ruleCount }) {
    return (
      <div className="stepper">
        {STEPS.map((s, i) => (
          <React.Fragment key={s.id}>
            <div
              className={"step " + (s.id === step ? "active" : s.id < step ? "done" : "")}
              onClick={() => setStep(s.id)}
            >
              <span className="num">{s.id + 1}</span>{s.label}
              {s.id === 0 && assetCount > 0 ? <span className="badge-count">{assetCount}</span> : null}
              {s.id === 2 && edgeCount > 0 ? <span className="badge-count">{edgeCount}</span> : null}
              {s.id === 3 && ruleCount > 0 ? <span className="badge-count">{ruleCount}</span> : null}
            </div>
            {i < STEPS.length - 1 ? <span className="arrow">›</span> : null}
          </React.Fragment>
        ))}
      </div>
    );
  }

  function NavButtons({ step, setStep, last }) {
    return (
      <div className="nav">
        <button onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}>‹ back</button>
        <span className="spacer" />
        {step < last ? <button className="primary" onClick={() => setStep(step + 1)}>next ›</button> : null}
      </div>
    );
  }

  OT.ui = OT.ui || {};
  OT.ui.STEPS = STEPS;
  OT.ui.Stepper = Stepper;
  OT.ui.NavButtons = NavButtons;
})(window.OT);
