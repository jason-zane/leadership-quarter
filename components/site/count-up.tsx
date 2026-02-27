'use client'

import { useEffect, useRef, useState } from 'react'
import { useInView } from 'framer-motion'

type Props = {
  target: number
  duration?: number
  prefix?: string
  suffix?: string
}

export function CountUp({ target, duration = 1400, prefix = '', suffix = '' }: Props) {
  const [count, setCount] = useState(0)
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, margin: '-30px' })

  useEffect(() => {
    if (!inView) return
    const start = Date.now()
    const tick = () => {
      const elapsed = Date.now() - start
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setCount(Math.round(eased * target))
      if (progress < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [inView, target, duration])

  return (
    <span ref={ref}>
      {prefix}
      {count.toLocaleString()}
      {suffix}
    </span>
  )
}
