import Image from 'next/image'

type SiteBrandMarkProps = {
  alt: string
  className?: string
  priority?: boolean
}

export function SiteBrandMark({ alt, className = '', priority = false }: SiteBrandMarkProps) {
  return (
    <Image
      src="/logos/lq-mark-site.png"
      alt={alt}
      width={1655}
      height={1285}
      priority={priority}
      sizes="(max-width: 768px) 34px, 40px"
      className={className}
    />
  )
}
