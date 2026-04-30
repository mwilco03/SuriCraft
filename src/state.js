// requires: OT.catalog (for default detectionsOn from catalog detections)
window.OT = window.OT || {};
(function (OT) {
  const STORAGE_KEY = "ot_rule_authoring_v3";

  function defaultState(catalog) {
    const detectionsOn = {};
    if (catalog && Array.isArray(catalog.detections)) {
      for (const d of catalog.detections) detectionsOn[d.id] = !!d.enabledByDefault;
    }
    return {
      step: 0,
      siteName: "REF-ICS",
      diagramRev: "v1.0",
      sidBase: 9500000,
      assets: [],
      edges: [],
      detectionsOn,
      commentOverrides: {},
    };
  }

  function loadState(catalog) {
    const base = defaultState(catalog);
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return base;
      const parsed = JSON.parse(raw);
      return { ...base, ...parsed, detectionsOn: { ...base.detectionsOn, ...(parsed.detectionsOn || {}) } };
    } catch (e) {
      return base;
    }
  }

  function saveState(s) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch (e) {}
  }

  function clearState() {
    try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
  }

  OT.state = { STORAGE_KEY, defaultState, loadState, saveState, clearState };
})(window.OT);
