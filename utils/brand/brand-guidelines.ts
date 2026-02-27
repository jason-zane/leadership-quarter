export type BrandColorKey =
  | 'background'
  | 'surface'
  | 'surfaceAlt'
  | 'textPrimary'
  | 'textBody'
  | 'textMuted'
  | 'onDarkPrimary'
  | 'onDarkMuted'
  | 'accent'
  | 'accentStrong'
  | 'accentDeep'
  | 'primary'
  | 'primaryHover'
  | 'ctaBg'
  | 'ctaText'
  | 'ctaHoverBg'
  | 'border'
  | 'overlayStrong'
  | 'overlayText'

export type BrandTypographyRole = 'display' | 'heading' | 'body' | 'ui' | 'micro'

export type BrandCtaVariant = 'primary' | 'secondary' | 'ghost'

export type BrandToneRule = {
  name: string
  description: string
  doExample: string
  avoidExample: string
}

export type BrandImageryCategory = {
  name: string
  purpose: string
  subjects: string[]
  avoid: string[]
}

export const brandGuidelines = {
  name: 'Miles Between',
  version: 'v1',
  colors: {
    background: { cssVar: '--site-bg', hex: '#FAF8F4' },
    surface: { cssVar: '--site-surface', hex: '#FAF8F4' },
    surfaceAlt: { cssVar: '--site-surface-alt', hex: '#EDE8DF' },
    textPrimary: { cssVar: '--site-text-primary', hex: '#1C1C1C' },
    textBody: { cssVar: '--site-text-body', hex: '#4A4A4A' },
    textMuted: { cssVar: '--site-text-muted', hex: '#8A8A8A' },
    onDarkPrimary: { cssVar: '--site-on-dark-primary', hex: '#FAF8F4' },
    onDarkMuted: { cssVar: '--site-on-dark-muted', hex: '#D7D2C8' },
    accent: { cssVar: '--site-accent', hex: '#7A9E8E' },
    accentStrong: { cssVar: '--site-accent-strong', hex: '#2C4A3E' },
    accentDeep: { cssVar: '--site-accent-deep', hex: '#243C32' },
    primary: { cssVar: '--site-primary', hex: '#2C4A3E' },
    primaryHover: { cssVar: '--site-primary-hover', hex: '#243C32' },
    ctaBg: { cssVar: '--site-cta-bg', hex: '#5A1F1F' },
    ctaText: { cssVar: '--site-cta-text', hex: '#FAF8F4' },
    ctaHoverBg: { cssVar: '--site-cta-hover-bg', hex: '#461616' },
    border: { cssVar: '--site-border', hex: '#2C4A3E' },
    overlayStrong: { cssVar: '--site-overlay-strong', hex: 'rgba(0, 0, 0, 0.65)' },
    overlayText: { cssVar: '--site-overlay-text', hex: '#FFFFFF' },
  } as Record<BrandColorKey, { cssVar: string; hex: string }>,
  typography: {
    display: {
      family: 'Playfair Display',
      usage: 'Hero and major page statements.',
    },
    heading: {
      family: 'Playfair Display',
      usage: 'Section and card headings.',
    },
    body: {
      family: 'Lora',
      usage: 'Paragraphs and long-form marketing copy.',
    },
    ui: {
      family: 'Inter',
      usage: 'Navigation, buttons, forms, labels, metadata.',
    },
    micro: {
      family: 'Lora',
      usage: 'Hints, metadata, disclaimers.',
    },
  } as Record<BrandTypographyRole, { family: string; usage: string }>,
  cta: {
    primary: {
      intent: 'Main conversion action on a section/page.',
      copyStyle: 'Clear action plus confidence.',
    },
    secondary: {
      intent: 'Alternative but meaningful action.',
      copyStyle: 'Exploratory or informational next step.',
    },
    ghost: {
      intent: 'Low-emphasis option.',
      copyStyle: 'Lightweight, optional actions.',
    },
  } as Record<BrandCtaVariant, { intent: string; copyStyle: string }>,
  toneOfVoice: {
    brandBelief: [
      'Running clears the head through movement in open space, not metrics.',
      'Shared effort creates fast, meaningful connection.',
      'Miles Between protects both quiet space and human connection.',
    ],
    audience: [
      'Recreational runners with full lives where running is part of identity, not all of it.',
      'People who value quality and reject inflated wellness language.',
    ],
    outcomes: ['Mental clarity', 'Perspective', 'Connection'],
    pillars: [
      'Earned confidence',
      'Specificity over atmosphere',
      'Warmth without softness',
      'A point of view',
      'Restraint',
      'Quiet persuasion',
    ],
    rules: [
      {
        name: 'Earned confidence',
        description: 'Write like someone who has done the thing, not someone performing premium language.',
        doExample: 'Three nights in the Otways, morning runs on empty trails.',
        avoidExample: 'A transformative premium experience unlike any other.',
      },
      {
        name: 'Specificity over atmosphere',
        description: 'One concrete detail beats three lines of mood.',
        doExample: 'The trail drops into the valley just after sunrise.',
        avoidExample: 'A breathtaking and immersive running journey.',
      },
      {
        name: 'Warmth without softness',
        description: 'Friendly, direct, respectful; never effusive or corporate.',
        doExample: 'We will send the full schedule once your place is confirmed.',
        avoidExample: 'You are going to absolutely love every magical moment!',
      },
      {
        name: 'Quiet persuasion',
        description: 'Create desire through clarity and detail, never pressure.',
        doExample: 'Twelve guests, three nights, no overpacked schedule.',
        avoidExample: 'Book now before this once-in-a-lifetime chance disappears.',
      },
    ] satisfies BrandToneRule[],
    contextRegisters: {
      retreatPages: 'Most expressive register; detailed and atmospheric.',
      booking: 'Direct and practical; clarity first.',
      email: 'Personal and restrained; written to one person.',
      social: 'Short register, no hashtags, no forced calls-to-action.',
    },
    grammarRules: [
      'Use second person (you) for reader and first person plural (we) sparingly.',
      'Short sentences and fragments are acceptable when intentional.',
      'No exclamation marks.',
      'No em dashes.',
      'No rhetorical questions.',
      'Prefer numbers and specifics over stacked adjectives.',
    ],
    bannedWords: ['journey', 'curated', 'elevated', 'immersive', 'bespoke', 'boutique', 'transformative'],
    prePublishTest: [
      'Could this have been written by any other retreat brand?',
      'Is there at least one specific, concrete detail?',
      'Does it sound like a person wrote it?',
    ],
    references: {
      voice: ['Early Kinfolk', 'Patagonia long-form', 'Aesop product copy', 'Craig Mod walking essays'],
      avoid: ['Wellness Instagram tone', 'Adventure tourism brochure language', 'Manifesto-style slogan copy'],
    },
  },
  contentRules: {
    headingLength: 'Aim for 4-12 words per headline line.',
    punctuation: 'Use sentence case for body/UI; reserve all-caps for small labels only.',
    ctaLength: '2-6 words preferred for buttons.',
    bannedPatterns: [
      'Generic startup jargon (synergy, disrupt, unlock potential).',
      'Overpromising claims without specifics.',
      'Clashing urgency language in premium retreat context.',
      'Random mixing of cream, green, and burgundy without hierarchy.',
    ],
  },
  imagery: {
    corePrinciple: 'Moments you happened to witness, not scenes staged for marketing.',
    direction: [
      'Editorial travel',
      'Outdoor landscape',
      'Human connection',
      'Quiet luxury',
    ],
    keywords: [
      'Quiet',
      'Grounded',
      'Observational',
      'Human',
      'Textural',
      'Unhurried',
      'Thoughtful',
      'Natural',
      'Understated',
    ],
    categories: [
      {
        name: 'Landscape & Environment',
        purpose: 'Sense of place, atmosphere, arrival.',
        subjects: [
          'Trails through valleys',
          'Forest light',
          'Mountains with scale',
          'Early mist',
          'Open terrain and horizon lines',
          'Weather moments',
          'Water and terrain texture',
        ],
        avoid: ['Drone cliches', 'Neon sunsets', 'Hyper HDR', 'Instagram-style spectacle'],
      },
      {
        name: 'People Running',
        purpose: 'Movement and relatability at conversational effort.',
        subjects: [
          'Small groups running together',
          'Trail moments',
          'Arriving, pausing, adjusting gear',
          'Back/side views',
          'Imperfect stride moments',
        ],
        avoid: [
          'Sprint poses',
          'Race bibs',
          'Finish-line celebrations',
          'Aggressive training faces',
          'Fitness-brand aesthetics',
        ],
      },
      {
        name: 'Human Connection',
        purpose: 'Trust and emotional pull.',
        subjects: [
          'Shared meals',
          'Conversation and laughter',
          'Coffee before a run',
          'Quiet companionship',
          'Evening atmosphere',
        ],
        avoid: ['Forced group poses', 'Corporate retreat vibe', 'Workshop-style staging'],
      },
      {
        name: 'Place & Texture',
        purpose: 'Luxury through tactile detail, without saying luxury.',
        subjects: [
          'Fireplaces',
          'Wood interiors',
          'Windows with views',
          'Linen texture',
          'Boots by the door',
          'Coffee steam',
          'Maps and gear details',
        ],
        avoid: ['Hotel brochure staging', 'Sterile interiors', 'Overly polished scenes'],
      },
    ] as BrandImageryCategory[],
    ratioMix: {
      environment: 40,
      peopleRunning: 30,
      connection: 20,
      texture: 10,
    },
    lighting: {
      preferred: ['Early morning', 'Golden hour', 'Overcast daylight', 'Window light', 'Firelight'],
      avoid: ['Hard midday sun', 'Studio lighting', 'Flash photography'],
    },
    grading: {
      target: ['Warm/neutral lean', 'Slightly muted tones', 'Soft shadows', 'Natural highlights'],
      avoid: ['Cool blue casts', 'Oversaturated greens', 'High-contrast processing'],
    },
    casting: {
      targetAgeRange: '30-55',
      guidance: [
        'Real, non-model-perfect people',
        'Different body types',
        'Different ethnic backgrounds',
        'Different genders',
        'No token diversity staging',
      ],
    },
    rejectionTest: [
      'Could this be a Nike ad? If yes, reject.',
      'Could this be a travel magazine feature? If yes, likely right.',
    ],
  },
} as const
