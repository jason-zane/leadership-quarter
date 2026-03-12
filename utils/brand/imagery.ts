export type BrandImage = {
  src: string
  alt: string
}

export const brandImagery = {
  home: {
    hero: {
      src: '/images/zach-heiberg-aRRyM6-hrFk-unsplash.jpg',
      alt: 'Glass office towers with warm golden hour reflections',
    } satisfies BrandImage,
    split: {
      src: '/images/niko-n-lh6ncy_ZVtI-unsplash.jpg',
      alt: 'Silhouette of a person in a golden hour urban setting',
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
      src: '/images/glauber-sampaio-N2cqyiXwV1Q-unsplash.jpg',
      alt: 'Warm golden glass building tower viewed from below',
    } satisfies BrandImage,
    executiveAssessment: {
      src: '/images/nima-motaghian-nejad-knRAe_ZgUxY-unsplash.jpg',
      alt: 'Stepped architectural building facade in warm afternoon light',
    } satisfies BrandImage,
    successionPlanning: {
      src: '/images/dominic-kurniawan-suryaputra-59n7RAMMABk-unsplash.jpg',
      alt: 'Modern glass tower at golden hour with city horizon',
    } satisfies BrandImage,
    talentStrategy: {
      src: '/images/andrea-de-santis-X95ent68l78-unsplash.jpg',
      alt: 'Curved modern glass tower against a soft evening sky',
    } satisfies BrandImage,
  },
  about: {
    mission: {
      src: '/images/andrew-klonaris-UMVb9tuxDBg-unsplash.jpg',
      alt: 'Heritage building facade beside a modern glass tower',
    } satisfies BrandImage,
    partner: {
      src: '/images/DSC_9980_(2).png',
      alt: 'Jason Hunt, Partner at Leadership Quarter',
    } satisfies BrandImage,
  },
} as const
