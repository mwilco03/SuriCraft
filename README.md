# SuriCraft

OT detection authoring SPA. Curate Suricata rules for ICS protocols (Modbus, DNP3, CIP, S7Comm, GE-SRTP), validate them against a documented data-flow diagram, and export a generic Suricata bundle (rules + include overlay + threshold config).

Static page, React via CDN, no build step. Publishes from `main` to GitHub Pages.

- See `docs/README.md` for the full overview.
- See `docs/how-this-works.md` for the access model (targets, operator/engineering/peer allow-lists, severity, threshold).
- See `docs/deploying-on-github-pages.md` to host your own copy.
- See `docs/suricata-deployment.md` for how to drop the bundle into any Suricata install.
- See `docs/catalog-schema.md` to add or edit detections.
- See `docs/known-limitations.md` before relying on the output for production.
- See `docs/roadmap.md` for what's planned and what's explicitly out of scope.

Bugs / feature requests: [open an issue](https://github.com/mwilco03/SuriCraft/issues).

License: MIT.
