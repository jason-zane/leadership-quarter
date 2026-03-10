#!/usr/bin/env node

import { execFile } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

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

function printHelp() {
  console.log(`Usage:
  node tools/pdf/test-sidecar-docker.mjs [--output <pdf>] [--port <10000>] [--api-key <key>]
  node tools/pdf/test-sidecar-docker.mjs --url <http://localhost:3001/document/...> [--base-url <http://host.docker.internal:3001/>] [--output <pdf>]

Options:
  --url           Fetch HTML from a webpage and send that HTML to the Docker sidecar.
  --base-url      Inject a <base> tag for relative assets. Useful when the sidecar runs in Docker.
  --output        Where to write the rendered PDF.
  --port          Host port for the sidecar container. Defaults to 10000.
  --api-key       Sidecar API key. Defaults to test-key.
  --image         Docker image tag. Defaults to leadership-quarter-sidecar-smoke.
  --container     Docker container name. Defaults to a timestamped smoke-test name.
  --skip-build    Reuse an existing Docker image instead of rebuilding it.
  --keep-container  Leave the sidecar container running after the smoke test.
  --help          Show this help text.
`)
}

function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    execFile(
      command,
      args,
      {
        cwd: options.cwd,
        env: options.env,
        maxBuffer: 1024 * 1024 * 20,
      },
      (error, stdout, stderr) => {
        if (error) {
          reject(
            new Error(
              [
                `Command failed: ${command} ${args.join(' ')}`,
                stdout?.trim() ? `stdout:\n${stdout.trim()}` : null,
                stderr?.trim() ? `stderr:\n${stderr.trim()}` : null,
              ]
                .filter(Boolean)
                .join('\n\n')
            )
          )
          return
        }

        resolve({ stdout, stderr })
      }
    )
  })
}

function runCommandWithInheritedIo(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = execFile(command, args, {
      cwd: options.cwd,
      env: options.env,
      maxBuffer: 1024 * 1024 * 20,
    })

    child.stdout?.pipe(process.stdout)
    child.stderr?.pipe(process.stderr)

    child.on('error', reject)
    child.on('exit', (code) => {
      if (code === 0) {
        resolve()
        return
      }

      reject(new Error(`Command failed with exit code ${code}: ${command} ${args.join(' ')}`))
    })
  })
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function getDefaultHtml() {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Leadership Quarter Docker PDF Smoke Test</title>
    <style>
      @page { size: A4; margin: 18mm; }
      body {
        font-family: Arial, sans-serif;
        color: #1a2a3d;
        margin: 0;
      }
      .card {
        border: 1px solid rgba(29, 46, 68, 0.18);
        border-radius: 16px;
        padding: 24px;
        background: linear-gradient(145deg, #f8fcff, #eef5fb);
      }
      h1 {
        margin: 0 0 8px;
        font-size: 28px;
      }
      p {
        line-height: 1.6;
      }
      ul {
        padding-left: 20px;
      }
    </style>
  </head>
  <body>
    <main class="card">
      <h1>Docker PDF smoke test</h1>
      <p>This PDF was rendered by the sidecar container.</p>
      <ul>
        <li>Health check passed</li>
        <li>PDF endpoint returned application/pdf</li>
        <li>Output bytes looked like a PDF</li>
      </ul>
    </main>
  </body>
</html>`
}

function injectBaseHref(html, baseUrl) {
  if (!baseUrl || /<base\s/i.test(html)) {
    return html
  }

  const normalizedBaseUrl = new URL(baseUrl).toString()
  const baseTag = `<base href="${normalizedBaseUrl}">`

  if (/<head[^>]*>/i.test(html)) {
    return html.replace(/<head([^>]*)>/i, `<head$1>${baseTag}`)
  }

  return `${baseTag}${html}`
}

function isDockerHostTrap(urlString) {
  const url = new URL(urlString)
  return ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
}

async function waitForHealth(url, timeoutMs) {
  const startedAt = Date.now()
  let lastError = null

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url, { cache: 'no-store' })
      if (response.ok) {
        return
      }

      lastError = new Error(`Health check returned ${response.status} ${response.statusText}`)
    } catch (error) {
      lastError = error
    }

    await sleep(1000)
  }

  throw new Error(
    `Timed out waiting for sidecar health after ${Math.round(timeoutMs / 1000)} seconds.${
      lastError instanceof Error ? ` Last error: ${lastError.message}` : ''
    }`
  )
}

async function loadHtml(args) {
  if (!args.url) {
    return getDefaultHtml()
  }

  const response = await fetch(String(args.url), {
    cache: 'no-store',
    headers: {
      accept: 'text/html',
    },
  })

  const html = await response.text()

  if (!response.ok) {
    throw new Error(`Could not fetch HTML from ${args.url}: ${response.status} ${response.statusText}`)
  }

  const baseUrl = args['base-url'] || new URL('/', String(args.url)).toString()
  return injectBaseHref(html, String(baseUrl))
}

async function renderPdf({ port, apiKey, html, output }) {
  const response = await fetch(`http://127.0.0.1:${port}/render-pdf`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
    },
    body: JSON.stringify({ html }),
  })

  const buffer = Buffer.from(await response.arrayBuffer())
  const contentType = response.headers.get('content-type')?.toLowerCase() ?? ''
  const preview = buffer.toString('utf8', 0, Math.min(buffer.length, 200)).trim()

  if (!response.ok) {
    throw new Error(
      `Sidecar render failed with ${response.status} ${response.statusText}${preview ? `: ${preview}` : ''}`
    )
  }

  if (!contentType.includes('application/pdf')) {
    throw new Error(`Sidecar returned an unexpected content type: ${contentType || 'unknown'}`)
  }

  if (buffer.length === 0) {
    throw new Error('Sidecar returned an empty PDF response.')
  }

  if (!buffer.subarray(0, 4).toString('utf8').startsWith('%PDF')) {
    throw new Error('Sidecar response did not look like a PDF file.')
  }

  await mkdir(path.dirname(output), { recursive: true })
  await writeFile(output, buffer)
}

async function cleanupContainer(containerName) {
  if (!containerName) return

  try {
    await runCommand('docker', ['rm', '-f', containerName])
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.warn(`Container cleanup warning: ${message}`)
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  if (args.help) {
    printHelp()
    return
  }

  const image = String(args.image || 'leadership-quarter-sidecar-smoke')
  const port = Number.parseInt(String(args.port || '10000'), 10)
  const apiKey = String(args['api-key'] || 'test-key')
  const containerName = String(
    args.container || `leadership-quarter-sidecar-smoke-${Date.now()}`
  )
  const output = path.resolve(
    String(args.output || (args.url ? 'sidecar-page-smoke-test.pdf' : 'sidecar-smoke-test.pdf'))
  )
  const sidecarDir = path.resolve('sidecar')

  if (!Number.isFinite(port) || port <= 0) {
    throw new Error(`Invalid port: ${args.port}`)
  }

  if (args.url && !args['base-url'] && isDockerHostTrap(String(args.url))) {
    console.warn(
      'Warning: the sidecar container may not be able to resolve assets from localhost. ' +
        'If the webpage uses relative assets, pass --base-url http://host.docker.internal:3001/.'
    )
  }

  if (!args['skip-build']) {
    console.log(`Building Docker image ${image} from ${sidecarDir}...`)
    await runCommandWithInheritedIo('docker', ['build', '-t', image, '.'], { cwd: sidecarDir })
  }

  console.log(`Starting sidecar container ${containerName} on port ${port}...`)
  await runCommand('docker', [
    'run',
    '-d',
    '-p',
    `${port}:10000`,
    '--name',
    containerName,
    '-e',
    `SIDECAR_API_KEY=${apiKey}`,
    image,
  ])

  try {
    console.log('Waiting for sidecar health check...')
    await waitForHealth(`http://127.0.0.1:${port}/health`, 30_000)

    const html = await loadHtml(args)
    console.log(`Rendering PDF to ${output}...`)
    await renderPdf({ port, apiKey, html, output })

    console.log(`Smoke test passed. PDF created at ${output}`)
  } finally {
    if (!args['keep-container']) {
      await cleanupContainer(containerName)
    }
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
