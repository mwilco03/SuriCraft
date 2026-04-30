window.OT = window.OT || {};
(function (OT) {
  const REQUIRED_KEYS = ["version", "protocols", "roles", "severities", "detections"];

  async function loadCatalog(url) {
    const target = url || "./catalog/default-detections.json";
    let res;
    try {
      res = await fetch(target);
    } catch (e) {
      throw new Error("catalog fetch failed: " + e.message + " (" + target + ")");
    }
    if (!res.ok) {
      throw new Error("catalog HTTP " + res.status + " " + res.statusText + " (" + target + ")");
    }
    let parsed;
    try {
      parsed = await res.json();
    } catch (e) {
      throw new Error("catalog parse failed (" + target + "): " + e.message);
    }
    for (const k of REQUIRED_KEYS) {
      if (!(k in parsed)) throw new Error("catalog missing required key: " + k);
    }
    if (!parsed.stubs) parsed.stubs = {};
    return parsed;
  }

  OT.catalog = { loadCatalog };
})(window.OT);
