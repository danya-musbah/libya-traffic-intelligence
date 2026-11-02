# Static Deployment

## Deployment model

The project is a static site. Publish the contents of the repository, with `index.html` available as the entry page and the `css/`, `js/`, `assets/`, and `data/` directories retained at their relative paths. There is no build output, server-side process, environment configuration, or database migration.

The page fetches `data/accidents.csv` relative to the page URL. The hosting service must make that file readable from the same origin. If deployed under a subpath, preserve the directory layout beneath that path.

## Checklist

1. Review the data source and retain the synthetic-data notice unless replacing the sample with appropriately sourced data.
2. Publish the static files without excluding `index.html`, `data/accidents.csv`, the JavaScript, stylesheets, favicon, or license attribution.
3. Configure the host to serve `index.html` at the chosen site path and static files from their expected locations.
4. Prefer HTTPS for a public site.
5. Open the deployed page and verify initial CSV loading, filtering, map rendering, reports, and download behavior.
6. Confirm no secrets or unapproved data have been added to client-delivered files.

No hosting provider or deployment workflow is configured or verified by this repository. A deployment should be described as successful only after testing its actual hosted URL.
