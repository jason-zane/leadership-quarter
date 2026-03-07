/**
 * k6 load test for the Assessment Platform
 * Usage: k6 run --env BASE_URL=https://your-preview.vercel.app scripts/load-test.k6.js
 *
 * Requires a valid invitation token and campaign slug set via env vars:
 *   INVITATION_TOKEN  — a live pending invitation token in the preview DB
 *   CAMPAIGN_SLUG     — a live active campaign slug in the preview DB
 */

import http from 'k6/http'
import { check, sleep } from 'k6'
import { Trend, Rate, Counter } from 'k6/metrics'

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000'
const INVITATION_TOKEN = __ENV.INVITATION_TOKEN || 'replace-me'
const CAMPAIGN_SLUG = __ENV.CAMPAIGN_SLUG || 'replace-me'

const submitLatency = new Trend('submit_latency_ms', true)
const errorRate = new Rate('error_rate')
const rateLimitedCount = new Counter('rate_limited_429')

// Simulated responses for an 18-question assessment (all valid 1-5 values)
function makeResponses(questionCount = 18) {
  const responses = {}
  for (let i = 1; i <= questionCount; i++) {
    responses[`q${i}`] = Math.floor(Math.random() * 5) + 1
  }
  return responses
}

export const options = {
  scenarios: {
    // Scenario A: realistic cadence — 500 VUs over 2 minutes
    realistic_cadence: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 100 },
        { duration: '60s', target: 500 },
        { duration: '30s', target: 0 },
      ],
      gracefulRampDown: '10s',
      tags: { scenario: 'A' },
      exec: 'scenarioA',
    },

    // Scenario B: burst submit — 2000 VUs, all submit in a short window
    burst_submit: {
      executor: 'ramping-arrival-rate',
      startRate: 0,
      timeUnit: '1s',
      preAllocatedVUs: 200,
      maxVUs: 2000,
      stages: [
        { duration: '10s', target: 500 },
        { duration: '20s', target: 2000 },
        { duration: '10s', target: 0 },
      ],
      startTime: '3m',
      tags: { scenario: 'B' },
      exec: 'scenarioB',
    },

    // Scenario C: campaign registration burst — 200 VUs
    campaign_register_burst: {
      executor: 'constant-vus',
      vus: 200,
      duration: '60s',
      startTime: '6m',
      tags: { scenario: 'C' },
      exec: 'scenarioC',
    },
  },
  thresholds: {
    // Scenario A: p95 submit latency < 1000ms
    'submit_latency_ms{scenario:A}': ['p(95)<1000'],
    // Overall error rate < 1% (excluding expected 429s)
    error_rate: ['rate<0.01'],
    // HTTP error rate for non-429 responses
    'http_req_failed{expected_response:false}': ['rate<0.01'],
  },
}

// Scenario A — realistic cadence
export function scenarioA() {
  // Simulate answering 18 questions (120ms apart client-side)
  sleep(18 * 0.12)

  const res = http.post(
    `${BASE_URL}/api/assessments/invitation/${INVITATION_TOKEN}/submit`,
    JSON.stringify({ responses: makeResponses(18) }),
    { headers: { 'Content-Type': 'application/json' }, tags: { scenario: 'A' } }
  )

  submitLatency.add(res.timings.duration, { scenario: 'A' })

  const ok = check(res, {
    'submit 200 or 410 (idempotent)': (r) => r.status === 200 || r.status === 410,
  })
  if (!ok && res.status !== 429) errorRate.add(1)
  if (res.status === 429) rateLimitedCount.add(1)
}

// Scenario B — burst submit
export function scenarioB() {
  const res = http.post(
    `${BASE_URL}/api/assessments/invitation/${INVITATION_TOKEN}/submit`,
    JSON.stringify({ responses: makeResponses(18) }),
    { headers: { 'Content-Type': 'application/json' }, tags: { scenario: 'B' } }
  )

  submitLatency.add(res.timings.duration, { scenario: 'B' })

  const ok = check(res, {
    'no 500 on burst': (r) => r.status !== 500,
  })
  if (!ok) errorRate.add(1)
  if (res.status === 429) rateLimitedCount.add(1)
}

// Scenario C — campaign registration burst
export function scenarioC() {
  const email = `loadtest+${Date.now()}+${Math.random().toString(36).slice(2)}@example.com`
  const res = http.post(
    `${BASE_URL}/api/assessments/campaigns/${CAMPAIGN_SLUG}/register`,
    JSON.stringify({
      firstName: 'Load',
      lastName: 'Test',
      email,
      organisation: 'Test Org',
      role: 'Tester',
    }),
    { headers: { 'Content-Type': 'application/json' }, tags: { scenario: 'C' } }
  )

  const ok = check(res, {
    'register 200 or 429 (rate limited)': (r) => r.status === 200 || r.status === 429,
    'no 500 on registration': (r) => r.status !== 500,
  })
  if (!ok) errorRate.add(1)
  if (res.status === 429) rateLimitedCount.add(1)

  sleep(0.1)
}
