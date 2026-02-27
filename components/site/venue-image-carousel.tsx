'use client'

import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'

type VenueImage = { src: string; alt: string }

export function VenueImageCarousel({ images }: { images: VenueImage[] }) {
  const safeImages = useMemo(() => images.filter((img) => img.src.trim().length > 0), [images])
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (safeImages.length <= 1) return
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % safeImages.length)
    }, 4500)
    return () => clearInterval(timer)
  }, [safeImages.length])

  if (safeImages.length === 0) {
    return <div className="h-full w-full bg-[var(--site-surface-soft)]" />
  }

  const current = safeImages[index]

  return (
    <div className="relative h-full w-full overflow-hidden">
      <Image
        src={current.src}
        alt={current.alt}
        fill
        className="object-cover object-[center_48%] transition-opacity duration-500 md:object-center"
        sizes="(max-width: 1024px) 100vw, 50vw"
      />

      {safeImages.length > 1 ? (
        <>
          <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 gap-2 rounded-full bg-black/35 px-3 py-1.5">
            {safeImages.map((_, dotIndex) => (
              <button
                key={dotIndex}
                type="button"
                aria-label={`Show image ${dotIndex + 1}`}
                onClick={() => setIndex(dotIndex)}
                className={`h-1.5 w-1.5 rounded-full transition-colors ${
                  dotIndex === index ? 'bg-white' : 'bg-white/40 hover:bg-white/70'
                }`}
              />
            ))}
          </div>

          <div className="absolute inset-y-0 left-0 right-0 z-10 flex items-center justify-between px-2">
            <button
              type="button"
              aria-label="Previous image"
              onClick={() => setIndex((prev) => (prev - 1 + safeImages.length) % safeImages.length)}
              className="rounded-full bg-black/35 px-2.5 py-1.5 text-xs text-white transition-colors hover:bg-black/55"
            >
              Prev
            </button>
            <button
              type="button"
              aria-label="Next image"
              onClick={() => setIndex((prev) => (prev + 1) % safeImages.length)}
              className="rounded-full bg-black/35 px-2.5 py-1.5 text-xs text-white transition-colors hover:bg-black/55"
            >
              Next
            </button>
          </div>
        </>
      ) : null}
    </div>
  )
}
