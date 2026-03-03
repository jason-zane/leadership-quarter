import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Print: AI Capability Model',
  description: 'Print template for AI Capability Model report.',
}

export default function AiCapabilityModelPrintPage() {
  return (
    <main className="print-report">
      <header className="hero">
        <p className="eyebrow">Leadership Quarter Report</p>
        <h1>The AI Capability Model</h1>
        <p className="subtitle">A Human-Centred Framework for Performance in an AI-Enabled Environment</p>
        <p className="lead">Artificial intelligence does not create performance. Human capability does.</p>
      </header>

      <section>
        <h2>Model premise</h2>
        <p>
          As AI tools become embedded in professional workflows, the differentiator between
          organisations is not access to technology, but the capability of individuals to deploy it
          effectively, responsibly, and consistently.
        </p>
      </section>

      <section>
        <h2>Core competencies</h2>
        <h3>1. Intellectual Curiosity</h3>
        <p>
          Sustained drive to explore, experiment with, and refine AI use through structured
          iteration and learning from failed outputs.
        </p>
        <h3>2. Systems Thinking</h3>
        <p>
          Ability to turn AI interaction into repeatable workflows, templates, and process clarity
          that can scale consistently.
        </p>
        <h3>3. Critical Evaluation</h3>
        <p>
          Disciplined verification of AI outputs including logic, factual validity, bias risk,
          contextual suitability, and confidentiality boundaries.
        </p>
        <h3>4. Outcome Orientation</h3>
        <p>
          Deployment of AI toward measurable improvement in quality, speed, or decision outcomes,
          with discontinuation when value is not demonstrated.
        </p>
      </section>

      <section>
        <h2>Structural integrity</h2>
        <ul>
          <li>Curiosity without evaluation leads to exposure.</li>
          <li>Systems without outcome focus lead to inefficiency.</li>
          <li>Evaluation without curiosity leads to stagnation.</li>
          <li>Outcome focus without structure leads to inconsistency.</li>
        </ul>
      </section>

      <section>
        <h2>Application</h2>
        <ul>
          <li>Scenario-based tasks</li>
          <li>Workflow design exercises</li>
          <li>Output critique and verification challenges</li>
          <li>Value alignment case analysis</li>
        </ul>
        <p>Deployment levels: Individual capability profiling, team heatmaps, leadership strategy.</p>
      </section>

      <style>{`
        .print-report {
          max-width: 920px;
          margin: 0 auto;
          padding: 44px 40px 80px;
          color: #162739;
          font-family: "Plus Jakarta Sans", "Avenir Next", Arial, sans-serif;
          line-height: 1.55;
        }
        .print-report .hero {
          border: 1px solid rgba(22, 39, 57, 0.16);
          border-radius: 24px;
          background: linear-gradient(145deg, rgba(245, 250, 255, 0.9), rgba(228, 240, 255, 0.66));
          padding: 34px;
        }
        .print-report .eyebrow {
          margin: 0 0 8px;
          font-size: 11px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #5f7389;
          font-weight: 700;
        }
        .print-report h1 {
          margin: 0;
          font-family: "Newsreader", "Iowan Old Style", "Times New Roman", serif;
          font-size: 54px;
          line-height: 1.02;
          letter-spacing: -0.01em;
        }
        .print-report .subtitle {
          margin: 10px 0 0;
          font-size: 18px;
          color: #214e82;
        }
        .print-report .lead {
          margin: 18px 0 0;
          font-size: 18px;
        }
        .print-report section {
          margin-top: 44px;
          padding-top: 28px;
          border-top: 1px solid rgba(22, 39, 57, 0.12);
          break-inside: avoid;
        }
        .print-report h2 {
          margin: 0 0 10px;
          font-family: "Newsreader", "Iowan Old Style", "Times New Roman", serif;
          font-size: 34px;
          line-height: 1.08;
        }
        .print-report h3 {
          margin: 18px 0 6px;
          font-family: "Newsreader", "Iowan Old Style", "Times New Roman", serif;
          font-size: 24px;
          line-height: 1.12;
        }
        .print-report p,
        .print-report li {
          font-size: 14.5px;
          color: #3b4f65;
        }
        .print-report ul {
          margin: 6px 0 0 18px;
          padding: 0;
        }
        @media print {
          @page {
            size: A4;
            margin: 16mm;
          }
          .print-report {
            max-width: none;
            padding: 0;
          }
        }
      `}</style>
    </main>
  )
}
