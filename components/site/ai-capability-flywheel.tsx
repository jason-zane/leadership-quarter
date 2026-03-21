type FlywheelItem = {
  action: string
}

type AiCapabilityFlywheelProps = {
  items: readonly FlywheelItem[]
}

const VIEWBOX_SIZE = 520
const CENTER = 260
const OUTER_RADIUS = 148
const LABEL_RADIUS = 184

function polarPoint(angleDegrees: number, radius: number) {
  const radians = ((angleDegrees - 90) * Math.PI) / 180
  return {
    x: CENTER + radius * Math.cos(radians),
    y: CENTER + radius * Math.sin(radians),
  }
}

function polarArc(startAngle: number, endAngle: number, radius: number) {
  const start = polarPoint(startAngle, radius)
  const end = polarPoint(endAngle, radius)
  const largeArcFlag = endAngle - startAngle <= 180 ? 0 : 1

  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`
}

function labelLayout(angle: number, label: string) {
  const point = polarPoint(angle, LABEL_RADIUS)

  let textAnchor: 'start' | 'middle' | 'end' = 'middle'
  let baselineShift = 0

  if (point.x < CENTER - 28) {
    textAnchor = 'end'
  } else if (point.x > CENTER + 28) {
    textAnchor = 'start'
  }

  if (point.y < CENTER - 120) {
    baselineShift = -6
  } else if (point.y > CENTER + 120) {
    baselineShift = 16
  } else {
    baselineShift = 5
  }

  return {
    point,
    textAnchor,
    baselineShift,
    lines: [label],
  }
}

export function AiCapabilityFlywheel({ items }: AiCapabilityFlywheelProps) {
  const nodes = items.map((item, index) => {
    const angle = index * 72
    return {
      item,
      angle,
      node: polarPoint(angle, OUTER_RADIUS),
      label: labelLayout(angle, item.action),
    }
  })

  const arcs = nodes.map((node, index) => {
    const startAngle = node.angle + 12
    const endAngle = nodes[(index + 1) % nodes.length].angle - 12 + (index === nodes.length - 1 ? 360 : 0)
    return polarArc(startAngle, endAngle, OUTER_RADIUS)
  })

  const arrowPositions = nodes.map((node, index) => {
    const nextAngle = nodes[(index + 1) % nodes.length].angle + (index === nodes.length - 1 ? 360 : 0)
    return polarPoint((node.angle + nextAngle) / 2, OUTER_RADIUS)
  })

  return (
    <section className="relative h-full min-h-[29.75rem] overflow-hidden py-0 md:min-h-[32.75rem]">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-[18%] h-24 w-24 -translate-x-1/2 rounded-full bg-[rgba(138,185,235,0.08)] blur-3xl" />
        <div className="absolute left-[18%] top-[34%] h-20 w-20 rounded-full bg-[rgba(129,171,223,0.06)] blur-3xl" />
      </div>

      <div className="relative mx-auto flex h-full max-w-[34rem] flex-col items-center">
        <p className="font-eyebrow mb-0 text-center text-[11px] uppercase tracking-[0.14em] text-[var(--site-text-muted)]">
          The complete AI-enabled picture
        </p>

        <div className="relative -mt-4 aspect-square w-full max-w-[31rem]">
          <svg aria-hidden="true" viewBox={`0 0 ${VIEWBOX_SIZE} ${VIEWBOX_SIZE}`} className="h-full w-full overflow-visible">
            <defs>
              <linearGradient id="ai-flywheel-ring" x1="16%" y1="18%" x2="86%" y2="84%">
                <stop offset="0%" stopColor="rgba(208,178,110,0.78)" />
                <stop offset="18%" stopColor="rgba(163,190,219,0.72)" />
                <stop offset="42%" stopColor="rgba(108,160,219,0.76)" />
                <stop offset="68%" stopColor="rgba(118,134,207,0.52)" />
                <stop offset="100%" stopColor="rgba(214,184,113,0.58)" />
              </linearGradient>
              <marker id="ai-flywheel-arrow" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
                <path d="M0,0 L8,4 L0,8 z" fill="rgba(180,154,94,0.42)" />
              </marker>
            </defs>

            <circle
              cx={CENTER}
              cy={CENTER}
              r={OUTER_RADIUS}
              fill="none"
              stroke="url(#ai-flywheel-ring)"
              strokeWidth="4"
            />

            {arcs.map((arc, index) => (
              <path
                key={arc}
                d={arc}
                fill="none"
                stroke="rgba(94,132,186,0.34)"
                strokeWidth="3"
                strokeLinecap="round"
                opacity={index % 2 === 0 ? 0.9 : 0.72}
              />
            ))}

            {arrowPositions.map((position, index) => (
              <path
                key={`arrow-${index}`}
                d={`M ${position.x - 8} ${position.y} L ${position.x + 8} ${position.y}`}
                fill="none"
                stroke="rgba(94,132,186,0.38)"
                strokeWidth="2.4"
                strokeLinecap="round"
                markerEnd="url(#ai-flywheel-arrow)"
                transform={`rotate(${nodes[index].angle + 36} ${position.x} ${position.y})`}
              />
            ))}

            {nodes.map(({ item, node, label }) => (
              <g key={item.action}>
                <circle
                  cx={node.x}
                  cy={node.y}
                  r="8.5"
                  fill="rgba(249,251,254,0.92)"
                  stroke="rgba(105,143,194,0.38)"
                  strokeWidth="2.5"
                />
                <text
                  x={label.point.x}
                  y={label.point.y + label.baselineShift}
                  textAnchor={label.textAnchor}
                  fill="rgba(35,54,85,0.92)"
                  style={{
                    fontFamily: 'var(--font-eyebrow, inherit)',
                    fontSize: '16px',
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                    fontWeight: 600,
                  }}
                >
                  {label.lines[0]}
                </text>
              </g>
            ))}

            <g transform={`translate(${CENTER} ${CENTER - 2})`}>
              <text
                x="0"
                y="-2"
                textAnchor="middle"
                fill="rgba(66,103,166,0.97)"
                style={{
                  fontFamily: 'Georgia, Times New Roman, serif',
                  fontSize: '28px',
                  lineHeight: 1,
                }}
              >
                <tspan x="0" dy="0">
                  Capability that
                </tspan>
                <tspan x="0" dy="33">
                  builds on itself.
                </tspan>
              </text>
            </g>
          </svg>

          <p className="absolute inset-x-0 bottom-[0.55rem] mx-auto max-w-[20rem] text-center text-sm leading-relaxed text-[var(--site-text-body)] md:max-w-[21rem]">
            Explore, integrate, judge, add value, and learn, then return to the next wave stronger.
          </p>
        </div>
      </div>
    </section>
  )
}
