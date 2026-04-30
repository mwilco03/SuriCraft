# Vendored libraries

These files are committed verbatim from cdnjs so the SPA works on air-gapped hosts that cannot reach the public CDN. The repo intentionally has no build step; these are loaded as plain `<script>` tags from `index.html`.

## Files

| File | Source URL | License |
|---|---|---|
| `react-18.3.1.production.min.js` | https://cdnjs.cloudflare.com/ajax/libs/react/18.3.1/umd/react.production.min.js | MIT (Meta Platforms, Inc.) |
| `react-dom-18.3.1.production.min.js` | https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.3.1/umd/react-dom.production.min.js | MIT (Meta Platforms, Inc.) |
| `babel-standalone-7.25.6.min.js` | https://cdnjs.cloudflare.com/ajax/libs/babel-standalone/7.25.6/babel.min.js | MIT (Babel contributors) |
| `jszip-3.10.1.min.js` | https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js | MIT or GPLv3 (Stuart Knightley et al.) |

## Refreshing

To bump a version, replace the file with the new minified payload from cdnjs and update both this table and the script tag in `index.html`:

```sh
cd vendor
curl -fsSL -o react-18.3.1.production.min.js https://cdnjs.cloudflare.com/ajax/libs/react/18.3.1/umd/react.production.min.js
curl -fsSL -o react-dom-18.3.1.production.min.js https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.3.1/umd/react-dom.production.min.js
curl -fsSL -o babel-standalone-7.25.6.min.js https://cdnjs.cloudflare.com/ajax/libs/babel-standalone/7.25.6/babel.min.js
curl -fsSL -o jszip-3.10.1.min.js https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js
```

## Why vendor at all

OT/ICS workstations frequently sit behind strict egress proxies that block public CDNs entirely. Hosting these libraries from the same origin as the SPA means the page works whether or not cdnjs is reachable. The trade is roughly 3 MB of repo size (mostly `babel-standalone`); GitHub Pages serves it once per browser session and caches normally.
