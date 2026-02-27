'use client'

import { motion, useInView } from 'framer-motion'
import { useRef, type ReactNode } from 'react'

type Props = {
  children: ReactNode
  delay?: number
  y?: number
  className?: string
}

export function Reveal({ children, delay = 0, y = 24, className }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-60px 0px' })

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y }}
      transition={{ duration: 0.65, delay, ease: [0.21, 0.47, 0.32, 0.98] }}
      className={className}
    >
      {children}
    </motion.div>
  )
}
