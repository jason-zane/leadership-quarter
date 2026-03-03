import type { Metadata } from 'next'
import { lq8Applications, lq8Competencies, lq8Quadrants } from '@/utils/brand/lq8-content'

export const metadata: Metadata = {
  title: 'Print: LQ8 Framework',
  description: 'Print template for the LQ8 Leadership report.',
}

export default function Lq8FrameworkPrintPage() {
  return (
    <main className="print-report">
      <header className="hero">
        <p className="eyebrow">Leadership Quarter Report</p>
        <h1>LQ8 Leadership</h1>
        <p className="subtitle">Four quadrants. Eight competencies. One integrated leadership model.</p>
      </header>

      <section>
        <h2>Why LQ8</h2>
        <p>
          LQ8 provides a practical leadership capability model for improving judgement quality across
          hiring, development, succession, and performance decisions.
        </p>
      </section>

      <section>
        <h2>Quadrants</h2>
        <ul>
          {lq8Quadrants.map((quadrant) => (
            <li key={quadrant.id}>{quadrant.name}</li>
          ))}
        </ul>
      </section>

      <section>
        <h2>Competencies</h2>
        {lq8Competencies.map((competency) => (
          <div key={competency.id} className="row">
            <h3>{competency.name}</h3>
            <p>{competency.definition}</p>
          </div>
        ))}
      </section>

      <section>
        <h2>Applications</h2>
        {lq8Applications.map((application) => (
          <div key={application.title} className="row">
            <h3>{application.title}</h3>
            <p>{application.description}</p>
          </div>
        ))}
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
          margin: 10px 0 6px;
          font-family: "Newsreader", "Iowan Old Style", "Times New Roman", serif;
          font-size: 23px;
          line-height: 1.12;
        }
        .print-report p,
        .print-report li {
          margin: 0;
          font-size: 14.5px;
          color: #3b4f65;
        }
        .print-report ul {
          margin: 6px 0 0 18px;
          padding: 0;
        }
        .print-report .row + .row {
          margin-top: 12px;
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
