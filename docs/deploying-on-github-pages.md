# Deploying on GitHub Pages

Four commands. No GitHub Action, no build step, no token.

```sh
# 1. fork or push the repo to GitHub
gh repo create SuriCraft --public --source=. --remote=origin --push

# or, if you cloned this from elsewhere:
git remote set-url origin git@github.com:<you>/SuriCraft.git
git push -u origin main

# 2. enable Pages in repo settings:
#    Settings -> Pages -> Source: "Deploy from a branch"
#    Branch: main, folder: / (root)
#    Save
```

Site goes live at `https://<you>.github.io/SuriCraft/` within ~30 seconds.

## Why no GitHub Action?

The site is static HTML + JSON + JS. Pages-from-branch serves the repo as-is. An Action would only add a maintenance surface without speeding anything up.

## Why `.nojekyll`?

The repo contains a `src/` directory. Jekyll, GitHub Pages' default processor, would treat the leading underscore in some filenames as a hidden site collection and skip them. The empty `.nojekyll` file at repo root disables Jekyll entirely so every file is served verbatim.

## Custom domain

Add a `CNAME` file at the repo root containing your domain (one line, no scheme), then point a CNAME or ALIAS record at `<you>.github.io`. Pages handles the rest.

## Verifying

```sh
curl -sf https://<you>.github.io/SuriCraft/ > /dev/null && echo "page is up"
curl -sf https://<you>.github.io/SuriCraft/catalog/default-detections.json | head -1
```

If the catalog 404s, the directory layout was not preserved (check `.nojekyll`).
