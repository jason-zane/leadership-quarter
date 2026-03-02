export type BrandImage = {
  src: string
  alt: string
}

export const brandImagery = {
  home: {
    hero: {
      src: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=2200&q=80',
      alt: 'Contemporary city skyline with geometric architecture',
    } satisfies BrandImage,
    split: {
      src: 'https://images.unsplash.com/photo-1479839672679-a46483c0e7c8?auto=format&fit=crop&w=1800&q=80',
      alt: 'Modern glass building facade viewed from below',
    } satisfies BrandImage,
    story: {
      src: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1800&q=80',
      alt: 'Leadership team in strategic discussion',
    } satisfies BrandImage,
    impact: {
      src: 'https://images.unsplash.com/photo-1462899006636-339e08d1844e?auto=format&fit=crop&w=1800&q=80',
      alt: 'Abstract architectural detail with layered lines',
    } satisfies BrandImage,
  },
  cards: {
    environment: {
      src: 'https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1600&q=80',
      alt: 'Structured interior architecture with natural light',
    } satisfies BrandImage,
    running: {
      src: 'https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1600&q=80',
      alt: 'Executive workshop around a planning board',
    } satisfies BrandImage,
    texture: {
      src: 'https://images.unsplash.com/photo-1511818966892-d7d671e672a2?auto=format&fit=crop&w=1600&q=80',
      alt: 'Grid-like architectural detail in warm light',
    } satisfies BrandImage,
  },
  services: {
    executiveSearch: {
      src: 'https://images.unsplash.com/photo-1431540015161-0bf868a2d407?auto=format&fit=crop&w=1700&q=80',
      alt: 'Urban skyline representing leadership placement at scale',
    } satisfies BrandImage,
    executiveAssessment: {
      src: 'https://images.unsplash.com/photo-1507209696998-3c532be9b2b5?auto=format&fit=crop&w=1700&q=80',
      alt: 'Glass architecture representing analytical assessment',
    } satisfies BrandImage,
    successionPlanning: {
      src: 'https://images.unsplash.com/photo-1460472178825-e5240623afd5?auto=format&fit=crop&w=1700&q=80',
      alt: 'Layered building structures symbolizing continuity planning',
    } satisfies BrandImage,
    talentStrategy: {
      src: 'https://images.unsplash.com/photo-1488972685288-c3fd157d7c7a?auto=format&fit=crop&w=1700&q=80',
      alt: 'City grid view symbolising strategic organisational design',
    } satisfies BrandImage,
  },
  about: {
    mission: {
      src: 'https://images.unsplash.com/photo-1518005020951-eccb494ad742?auto=format&fit=crop&w=1900&q=80',
      alt: 'Bold architectural pattern with structural rhythm',
    } satisfies BrandImage,
  },
} as const
