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

## 4) Render print routes to high-quality PDFs

With the dev server running (`npm run dev`), generate PDFs from print templates:

```bash
npm run pdf:from-route -- --url http://localhost:3001/print/reports/ai-capability-model --output public/reports/ai-capability-model.pdf
npm run pdf:from-route -- --url http://localhost:3001/print/reports/lq8-framework --output public/reports/lq8-framework.pdf
```

## Notes

- Renderer uses local Chrome headless.
- If Chrome is not auto-detected, set:

```bash
export CHROME_PATH=\"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome\"
```
