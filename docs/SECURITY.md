# Security and Privacy Notes

## Application boundary

The application is a static browser demo. It has no accounts, authorization, server-side data store, API integration, or secret configuration. When hosted, the static host serves the HTML, CSS, JavaScript, and CSV; user-selected CSV files and generated report files are processed by the browser.

The default dataset is synthetic. Do not upload confidential, sensitive, or production personal data. This project has not undergone a formal security assessment and is not suitable as a secured multi-user service.

## Input handling

CSV text is parsed locally. The loader requires the declared columns and validates values, date consistency, flags, coordinates, closure duration, and unique record IDs before replacing the current application data. A file can still be large enough to exhaust browser memory; no upload-size limit is currently enforced.

The application renders record values as text or escapes them in generated HTML tooltips and insights. Keep those rules in place when adding new rendering paths; do not interpolate CSV values into HTML or SVG markup without context-appropriate escaping.

CSV header and category lookups use prototype-free dictionaries so special property names such as `__proto__` are treated as data rather than inherited object keys.

## Export handling

CSV serialization quotes fields as needed and prefixes spreadsheet-formula-like text values before export. Continue to treat exported files as untrusted data and test formula-injection handling if the serialization code changes.

## Hosting guidance

- Serve only the static project files over HTTPS when publishing the demo.
- Do not add secrets to client-side JavaScript or HTML; browser-delivered values are public.
- Use only synthetic or appropriately licensed and approved data.
- For a production system, define server-side authentication, authorization, validation, logging, retention, privacy, and operational controls before implementation.

## Third-party content

The repository includes a subset of Lucide SVG icons and its ISC license at `assets/lucide-LICENSE.txt`. No remote scripts, fonts, analytics, or runtime packages are loaded by the current page.

## Repository status

The inspected tracked-file list contained no `.env` files or other obvious environment-secret files. `.gitignore` excludes environment files while preserving example names. This is a point-in-time file check, not a historical secret scan or guarantee that credentials were never committed. If a credential is ever committed, revoke/rotate it first; deleting the file from the working tree does not invalidate it or remove it from Git history.
