'use client'

import { motion } from 'framer-motion'
import { ParallaxHero } from '@/components/site/parallax-hero'
import { TransitionLink } from '@/components/site/transition-link'
import { trackSiteEvent } from '@/utils/analytics'
import { brandImagery } from '@/utils/brand/imagery'

export function HomeHero() {
  return (
    <ParallaxHero
      src={brandImagery.home.hero.src}
      alt={brandImagery.home.hero.alt}
      imgClassName="object-[center_38%] md:object-center"
      useYouTube
      youtubeVideoId="kZAoizsl-kI"
      posterSrc="https://i.ytimg.com/vi/kZAoizsl-kI/maxresdefault.jpg"
    >
      <div className="relative z-10 mx-auto w-full max-w-7xl px-6 pt-24 sm:pt-28 md:pt-0 md:px-12">
        <div className="max-w-4xl">
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="font-ui mb-6 text-xs font-medium uppercase tracking-[0.25em] text-[var(--site-on-dark-muted)]"
          >
            Miles Between Retreats
          </motion.p>
          <div className="overflow-hidden">
            <motion.h1
              initial={{ opacity: 0, y: 48 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.45, ease: [0.21, 0.47, 0.32, 0.98] }}
              className="mb-8 font-serif text-5xl font-bold leading-[1.05] text-white md:text-7xl lg:text-[5.5rem]"
            >
              The run matters.
              <br />
              So does <span className="italic">everything in between.</span>
            </motion.h1>
          </div>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.7 }}
            className="max-w-xl text-lg leading-relaxed text-[var(--site-on-dark-muted)] md:text-xl"
          >
            Retreats built around the run, the food, the conversation, and the rare feeling of
            having nowhere else to be.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.9 }}
            className="mt-10 flex flex-wrap gap-4"
          >
            <TransitionLink
              href="/retreats"
              onClick={() =>
                trackSiteEvent('cta_clicked', {
                  cta_id: 'home_hero_view_retreats',
                  page_type: 'home',
                })
              }
              className="font-ui bg-[var(--site-cta-bg)] px-8 py-4 text-sm font-medium tracking-[0.02em] text-[var(--site-cta-text)] transition-colors hover:bg-[var(--site-cta-hover-bg)]"
            >
              Explore Retreats
            </TransitionLink>
            <TransitionLink
              href="/experience"
              onClick={() =>
                trackSiteEvent('cta_clicked', {
                  cta_id: 'home_hero_join_list',
                  page_type: 'home',
                })
              }
              className="font-ui border border-white/60 px-8 py-4 text-sm font-medium tracking-[0.02em] text-white transition-colors hover:bg-[var(--site-surface-elevated)]/10"
            >
              See The Experience
            </TransitionLink>
          </motion.div>
        </div>
      </div>
    </ParallaxHero>
  )
}
