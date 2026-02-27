'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Retreat } from '@/lib/retreats'
import { trackSiteEvent } from '@/utils/analytics'
import { siteButtonClasses, siteTextClasses } from '@/utils/brand/site-brand'

export function StickyRetreatCta({ retreat }: { retreat: Retreat }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > window.innerHeight * 0.85)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          exit={{ y: 100 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-between gap-4 border-t border-[color:var(--site-on-dark-primary)]/10 bg-[color:var(--site-accent-strong)]/95 px-6 py-4 shadow-xl backdrop-blur-sm"
        >
          <div className="min-w-0">
            <p className={`${siteTextClasses.meta} text-[var(--site-on-dark-primary)]`}>{retreat.name}</p>
            <p className={`${siteTextClasses.meta} text-sm text-[var(--site-on-dark-muted)]`}>
              {retreat.dates} · From ${retreat.priceFrom.toLocaleString()} pp
            </p>
          </div>
          <a
            href="#register"
            onClick={() =>
              trackSiteEvent('cta_clicked', {
                cta_id: 'sticky_retreat_apply',
                page_type: 'retreat',
                retreat_slug: retreat.slug,
              })
            }
            className={`shrink-0 px-6 py-3 text-sm font-medium transition-colors ${siteButtonClasses.primary}`}
          >
            Apply for This Retreat
          </a>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
