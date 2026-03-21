import fs from 'node:fs'
import path from 'node:path'

const repoRoot = process.cwd()

const errors = []

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    const relativePath = path.relative(repoRoot, fullPath)

    if (
      relativePath === 'node_modules'
      || relativePath.startsWith(`node_modules${path.sep}`)
      || relativePath === '.git'
      || relativePath.startsWith(`.git${path.sep}`)
      || relativePath === '.next'
      || relativePath.startsWith(`.next${path.sep}`)
      || relativePath === 'coverage'
      || relativePath.startsWith(`coverage${path.sep}`)
    ) {
      continue
    }

    if (entry.isDirectory()) {
      walk(fullPath)
      continue
    }

    checkGeneratedResidue(relativePath)
    if (relativePath.endsWith('.md')) checkMarkdownLinks(relativePath)
  }
}

function checkGeneratedResidue(relativePath) {
  const normalized = relativePath.split(path.sep).join('/')
  const bannedMatchers = [
    /^test-results\//,
    /^public\/reports\/\.tmp\//,
    /(^|\/)__pycache__\//,
    /\.pyc$/,
  ]

  for (const matcher of bannedMatchers) {
    if (matcher.test(normalized)) {
      errors.push(`Generated artifact tracked in repo: ${normalized}`)
      return
    }
  }
}

function checkMarkdownLinks(relativePath) {
  if (relativePath.startsWith(`docs${path.sep}archive${path.sep}`)) {
    return
  }

  const absolutePath = path.join(repoRoot, relativePath)
  const text = fs.readFileSync(absolutePath, 'utf8')
  const linkPattern = /\[[^\]]+\]\(([^)]+)\)/g

  for (const match of text.matchAll(linkPattern)) {
    const target = match[1]
    if (
      !target
      || target.startsWith('http://')
      || target.startsWith('https://')
      || target.startsWith('mailto:')
      || target.startsWith('#')
    ) {
      continue
    }

    const withoutHash = target.split('#')[0]
    if (!withoutHash) continue

    const resolved = path.resolve(path.dirname(absolutePath), withoutHash)
    if (!fs.existsSync(resolved)) {
      errors.push(`Broken markdown link: ${relativePath} -> ${target}`)
    }
  }
}

function checkCronDocs() {
  const cronRouteDir = path.join(repoRoot, 'app/api/cron')
  const liveRoutes = new Set()

  if (fs.existsSync(cronRouteDir)) {
    const entries = fs.readdirSync(cronRouteDir, { withFileTypes: true })
    for (const entry of entries) {
      if (!entry.isDirectory()) continue
      const routeFile = path.join(cronRouteDir, entry.name, 'route.ts')
      if (fs.existsSync(routeFile)) {
        liveRoutes.add(`/api/cron/${entry.name}`)
      }
    }
  }

  const filesToCheck = [
    'README.md',
    'vercel.json',
    'docs/production-checklist.md',
    'docs/deployment-flow.md',
    'docs/queue-operations-runbook.md',
    'docs/launch-cutover-checklist.md',
  ]

  const routePattern = /\/api\/cron\/[a-z0-9-]+/g
  for (const relativePath of filesToCheck) {
    const absolutePath = path.join(repoRoot, relativePath)
    if (!fs.existsSync(absolutePath)) continue
    const text = fs.readFileSync(absolutePath, 'utf8')
    const matches = text.match(routePattern) ?? []
    for (const route of matches) {
      if (!liveRoutes.has(route)) {
        errors.push(`Documented cron route does not exist: ${relativePath} -> ${route}`)
      }
    }
  }
}

walk(repoRoot)
checkCronDocs()

if (errors.length > 0) {
  console.error('Repository audit failed:\n')
  for (const error of errors) {
    console.error(`- ${error}`)
  }
  process.exit(1)
}

console.log('Repository audit passed.')
