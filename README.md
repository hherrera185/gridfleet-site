# gridfleet-site

Cloudflare-native public landing page for GridFleet.ai.

This directory is the public-site source for the Cloudflare Pages project named gridfleet. Keep updates in this static HTML/CSS/JS baseline unless a future Cloudflare Pages Functions layer is explicitly added. Do not replace this with a GitHub Pages mirror.

## Live Proof Observatory

The public metrics section reads public-site/data/public-grid-metrics.snapshot.json, a sanitized public-safe projection generated from canonical Grid metric definitions.

Regenerate and validate it from the repo root with:

    npm run grid:public-metrics:publish

The snapshot must not expose internal source paths, adapters, owners, operator names, credentials, private logs, raw vulnerability details, customer data, internal PIDs, or request payloads. Internal lineage stays in config/grid-client-metric-manifest.json and operator-side services.
