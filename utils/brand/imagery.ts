export type BrandImage = {
  src: string
  alt: string
  category: 'environment' | 'people_running' | 'connection' | 'texture'
}

export const brandImagery = {
  home: {
    hero: {
      src: 'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?auto=format&fit=crop&w=2400&q=80',
      alt: 'Runner moving along an alpine trail at sunrise',
      category: 'people_running',
    } satisfies BrandImage,
    story: {
      src: 'https://images.unsplash.com/photo-1623390003553-4fa3f9fceb89?auto=format&fit=crop&w=1200&q=80',
      alt: 'Runner moving through a wooded trail at easy pace, back view',
      category: 'people_running',
    } satisfies BrandImage,
    connection: {
      src: 'https://images.unsplash.com/photo-1529333166437-7750a6dd5a70?auto=format&fit=crop&w=1200&q=80',
      alt: 'Friends sharing coffee outdoors before a run',
      category: 'connection',
    } satisfies BrandImage,
    spotlight: {
      src: 'https://images.unsplash.com/photo-1452626038306-9aae5e071dd3?auto=format&fit=crop&w=1200&q=80',
      alt: 'Trail runners moving through a pine forest trail',
      category: 'people_running',
    } satisfies BrandImage,
  },
  cards: {
    environment: {
      src: 'https://images.unsplash.com/photo-1482192505345-5655af888cc4?auto=format&fit=crop&w=900&q=80',
      alt: 'Wide trail through eucalyptus landscape at golden hour',
      category: 'environment',
    } satisfies BrandImage,
    running: {
      src: 'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?auto=format&fit=crop&w=900&q=80',
      alt: 'Small group running side by side at conversational pace',
      category: 'people_running',
    } satisfies BrandImage,
    texture: {
      src: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=900&q=80',
      alt: 'Warm and minimal interior lounge with natural textures',
      category: 'texture',
    } satisfies BrandImage,
  },
  about: {
    team: {
      src: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1200&q=80',
      alt: 'Small group sharing a meal outdoors in warm afternoon light',
      category: 'connection',
    } satisfies BrandImage,
  },
  experience: {
    running: {
      src: 'https://images.unsplash.com/photo-1752659985958-cb2bc9e5875e?auto=format&fit=crop&w=1200&q=80',
      alt: 'Two runners at easy pace on a tree-lined path',
      category: 'people_running',
    } satisfies BrandImage,
    table: {
      src: 'https://images.unsplash.com/photo-1424847651672-bf20a4b0982b?auto=format&fit=crop&w=1200&q=80',
      alt: 'People sharing a meal around a table with various dishes',
      category: 'connection',
    } satisfies BrandImage,
    company: {
      src: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=1200&q=80',
      alt: 'Two runners chatting during an easy training run',
      category: 'people_running',
    } satisfies BrandImage,
    rest: {
      src: 'https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?auto=format&fit=crop&w=1200&q=80',
      alt: 'Quiet interior lounge with fireplace and textured materials',
      category: 'texture',
    } satisfies BrandImage,
  },
  retreats: {
    southernHighlandsHero: {
      src: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=2400&q=80',
      alt: 'Highland ridges and valley floor under low cloud',
      category: 'environment',
    } satisfies BrandImage,
    southernHighlandsVenue: {
      src: 'https://images.unsplash.com/photo-1518780664697-55e3ad937233?auto=format&fit=crop&w=1200&q=80',
      alt: 'Country house exterior with garden and soft natural tones',
      category: 'texture',
    } satisfies BrandImage,
  },
} as const
