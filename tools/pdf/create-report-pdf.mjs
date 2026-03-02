#!/usr/bin/env node

import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { spawn } from 'node:child_process'

function parseArgs(argv) {
  const args = {}
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i]
    if (!token.startsWith('--')) continue
    const key = token.slice(2)
    const next = argv[i + 1]
    if (!next || next.startsWith('--')) {
      args[key] = true
      continue
    }
    args[key] = next
    i += 1
  }
  return args
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function renderSections(sections) {
  return sections
    .map((section) => {
      const bullets = Array.isArray(section.bullets)
        ? section.bullets
            .map((bullet) => `<li>${escapeHtml(bullet)}</li>`)
            .join('')
        : ''

      return `
        <section class="section">
          <p class="eyebrow">${escapeHtml(section.eyebrow || '')}</p>
          <h2>${escapeHtml(section.heading || '')}</h2>
          <p class="lead">${escapeHtml(section.body || '')}</p>
          ${bullets ? `<ul>${bullets}</ul>` : ''}
        </section>
      `
    })
    .join('\n')
}

function renderReferences(references) {
  if (!Array.isArray(references) || references.length === 0) return ''
  const items = references
    .map((reference) => `<p>${escapeHtml(reference)}</p>`)
    .join('\n')

  return `
    <section class="section">
      <p class="eyebrow">References</p>
      <div class="refs">
        ${items}
      </div>
    </section>
  `
}

function buildHtml(data) {
  const title = escapeHtml(data.title || 'Untitled Report')
  const subtitle = escapeHtml(data.subtitle || '')
  const author = escapeHtml(data.author || '')
  const date = escapeHtml(data.date || '')
  const summary = escapeHtml(data.summary || '')
  const sections = renderSections(Array.isArray(data.sections) ? data.sections : [])
  const references = renderReferences(data.references)

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${title}</title>
  <style>
    :root {
      --bg: #f7f4ee;
      --surface-soft: rgba(255, 255, 255, 0.82);
      --text-primary: #1a2a3d;
      --text-body: #40556c;
      --text-muted: #6f8299;
      --accent-strong: #244f81;
      --border: rgba(29, 46, 68, 0.14);
      --border-soft: rgba(29, 46, 68, 0.1);
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: var(--bg);
      color: var(--text-primary);
      font-family: "Plus Jakarta Sans", "Avenir Next", "Helvetica Neue", Arial, sans-serif;
      line-height: 1.58;
    }
    .report {
      max-width: 940px;
      margin: 0 auto;
      padding: 56px 44px 84px;
    }
    .hero {
      border: 1px solid var(--border);
      background: linear-gradient(145deg, rgba(248,252,255,0.8), rgba(229,241,255,0.56));
      border-radius: 26px;
      padding: 44px;
    }
    .eyebrow {
      text-transform: uppercase;
      letter-spacing: 0.08em;
      font-size: 11px;
      font-weight: 700;
      color: var(--text-muted);
      margin: 0 0 12px;
    }
    h1, h2 {
      font-family: "Newsreader", "Iowan Old Style", "Times New Roman", serif;
      line-height: 1.08;
      letter-spacing: -0.01em;
      margin: 0;
      color: var(--text-primary);
    }
    h1 { font-size: 52px; }
    h2 { font-size: 34px; margin-bottom: 10px; }
    .subtitle {
      margin-top: 14px;
      font-size: 18px;
      color: var(--accent-strong);
    }
    .meta {
      margin-top: 20px;
      font-size: 12px;
      color: var(--text-muted);
    }
    .lead {
      margin: 0;
      font-size: 16px;
      color: var(--text-body);
    }
    .section {
      position: relative;
      margin-top: 56px;
      padding-top: 56px;
    }
    .section::before {
      content: "";
      position: absolute;
      left: 0;
      right: 0;
      top: 0;
      border-top: 1px solid var(--border-soft);
    }
    ul { margin: 10px 0 0 20px; padding: 0; color: var(--text-body); }
    li { margin-bottom: 4px; }
    .refs {
      columns: 2;
      column-gap: 24px;
      font-size: 13px;
      color: var(--text-body);
    }
    .refs p { margin: 0 0 8px; break-inside: avoid; }
    @media print {
      @page { size: A4; margin: 16mm; }
      body { background: white; }
      .report { max-width: none; padding: 0; }
      .section { margin-top: 42px; padding-top: 42px; }
    }
  </style>
</head>
<body>
  <main class="report">
    <section class="hero">
      <p class="eyebrow">Leadership Quarter Report</p>
      <h1>${title}</h1>
      <p class="subtitle">${subtitle}</p>
      <p class="lead" style="margin-top:16px;">${summary}</p>
      <p class="meta">${author}${author && date ? ' • ' : ''}${date}</p>
    </section>
    ${sections}
    ${references}
  </main>
</body>
</html>
`
}

async function runNodeScript(args) {
  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, {
      stdio: 'inherit',
    })

    child.on('error', reject)
    child.on('exit', (code) => {
      if (code === 0) {
        resolve()
        return
      }
      reject(new Error(`PDF render process exited with code ${code}`))
    })
  })
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const input = path.resolve(String(args.input || 'tools/pdf/reports/my-report.json'))
  const output = path.resolve(
    String(args.output || 'public/reports/generated-report.pdf')
  )

  const json = await readFile(input, 'utf8')
  const data = JSON.parse(json)
  const html = buildHtml(data)

  const tempDir = path.resolve('public/reports/.tmp')
  await mkdir(tempDir, { recursive: true })
  const tempHtml = path.join(
    tempDir,
    `${path.basename(output, '.pdf')}-${Date.now()}.html`
  )
  await writeFile(tempHtml, html, 'utf8')

  await mkdir(path.dirname(output), { recursive: true })

  try {
    await runNodeScript([
      path.resolve('tools/pdf/render-pdf.mjs'),
      '--input',
      tempHtml,
      '--output',
      output,
    ])
  } finally {
    await unlink(tempHtml).catch(() => {})
  }
}

main().catch((error) => {
  console.error(error.message)
  process.exit(1)
})
