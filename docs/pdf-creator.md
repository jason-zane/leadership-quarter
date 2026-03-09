# PDF Creator Workflow

This repo includes a JSON-driven PDF creator that outputs full-page branded reports.

## 1) Create a report template JSON

```bash
npm run pdf:template -- --output tools/pdf/reports/my-report.json
```

Edit the generated file:
- `title`
- `subtitle`
- `author`
- `date`
- `summary`
- `sections[]`
- `references[]`

## 2) Generate a PDF from JSON

```bash
npm run pdf:create -- --input tools/pdf/reports/my-report.json --output public/reports/my-report.pdf
```

## 3) Render any existing HTML to PDF

```bash
npm run pdf:render -- --input public/reports/some-report.html --output public/reports/some-report.pdf
```

## Notes

- Renderer uses local Chrome headless.
- Public framework and assessment reports are delivered through gated web pages and saved as PDFs via the browser print flow, not repo-managed print routes.
- If Chrome is not auto-detected, set:

```bash
export CHROME_PATH=\"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome\"
```
