window.OT = window.OT || {};
(function (OT) {
  function downloadFile(name, content) {
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function downloadZip(bundle, filename) {
    if (typeof window.JSZip !== "function") {
      throw new Error("JSZip not loaded; check the CDN <script> tag in index.html");
    }
    const zip = new window.JSZip();
    for (const [name, content] of Object.entries(bundle)) {
      zip.file(name, content);
    }
    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename || "ics-bundle.zip";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  OT.zip = { downloadFile, downloadZip };
})(window.OT);
