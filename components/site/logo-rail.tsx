'use client'

import Image from 'next/image'
import { motion, useReducedMotion } from 'framer-motion'
import { brandLogos } from '@/utils/brand/brand-logos'

export function LogoRail() {
  const reduceMotion = useReducedMotion()
  const marquee = [...brandLogos, ...brandLogos]

  return (
    <section className="py-10 md:py-16" aria-label="Trusted by leading organisations">
      <div className="mx-auto max-w-7xl px-6 md:px-12">
        <p className="font-eyebrow mb-6 text-center text-xs uppercase tracking-[0.1em] text-[var(--site-text-muted)]">
          Trusted by leadership teams at
        </p>
        <div className="site-glass-card-strong relative overflow-hidden rounded-[var(--radius-cut)] py-3">
          <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-28 bg-[linear-gradient(90deg,var(--site-surface-elevated),transparent)]" />
          <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-28 bg-[linear-gradient(270deg,var(--site-surface-elevated),transparent)]" />

          <motion.div
            className="flex w-max items-center"
            animate={reduceMotion ? { x: 0 } : { x: ['0%', '-50%'] }}
            transition={
              reduceMotion ? { duration: 0 } : { duration: 30, repeat: Infinity, ease: 'linear' }
            }
          >
            {marquee.map((logo, index) => (
              <div
                key={`${logo.name}-${index}`}
                className="mx-9 flex h-14 min-w-[240px] items-center justify-center text-[var(--site-text-muted)]"
                aria-hidden={index >= brandLogos.length}
              >
                <Image
                  src={logo.src}
                  alt={logo.alt}
                  width={285}
                  height={84}
                  unoptimized
                  loading="lazy"
                  className="h-[52px] w-auto object-contain opacity-95"
                />
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  )
}
