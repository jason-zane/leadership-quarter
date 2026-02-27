# Miles Between Brand Guidelines

## Purpose
Miles Between should feel premium, calm, and grounded.

Visual hierarchy rule:

- Cream = space
- Green = environment
- Burgundy = action

## Palette

### Foundation
- Soft Paper: `#FAF8F4` (main canvas, cards, form backgrounds)
- Limestone: `#EDE8DF` (alternate sections, subtle contrast blocks)
- Charcoal Ink: `#1C1C1C` (headlines, key labels)
- Weathered Slate: `#4A4A4A` (body copy)
- Mist Grey: `#8A8A8A` (metadata, secondary labels)

### Brand Environment
- Deep Forest: `#2C4A3E` (nav/footer, environment sections, secondary CTA)
- Forest Shadow: `#243C32` (hover/pressed state on green)
- Optional Soft Accent: `#7A9E8E` (sparingly for subtle detail)

### Action System
- Oxide Red: `#5A1F1F` (primary CTA)
- Iron Oxide: `#461616` (primary CTA hover)

### Dark Section Typography
- Primary on dark: `#FAF8F4`
- Muted on dark: `#D7D2C8`

### Overlay Utility
- Overlay background: `rgba(0,0,0,0.65)`
- Overlay text: `#FFFFFF`

## Buttons

### Primary CTA
- Background: `#5A1F1F`
- Text: `#FAF8F4`
- Hover: `#461616`

### Secondary CTA
- Background: `#2C4A3E`
- Text: `#FAF8F4`
- Hover: `#243C32`

### Outline (light background)
- Border/Text: `#2C4A3E`

### Outline (dark background)
- Border/Text: `#FAF8F4`

### Optional outline accent
- Border/Text: `#5A1F1F`

## Typography
- Display + headings: Playfair Display
- Body: Lora
- UI / structure: Inter (nav, buttons, forms, labels, metadata)

## Tone of Voice
Full source: `docs/tone-of-voice.md`

Non-negotiables:
- Calm authority, never hard sell
- Specific detail over mood language
- No exclamation marks, no em dashes, no rhetorical questions
- Avoid generic premium and wellness jargon

## Imagery Direction

Core principle:

- Images should feel observed, not staged.
- Calm presence over drama. Specific over spectacular.

Brand fit:

- Editorial travel
- Outdoor landscape
- Human connection
- Quiet luxury

### Primary Image Categories

1. Landscape & Environment
- Purpose: sense of place and atmosphere.
- Use: trails, terrain, mist, weather, horizon lines.
- Avoid: drone cliches, neon sunsets, hyper-HDR spectacle.

2. People Running
- Purpose: relatable movement.
- Use: conversational pace, small groups, imperfect stride moments.
- Avoid: race visuals, sprint poses, aggressive training energy.

3. Human Connection
- Purpose: trust and emotional pull.
- Use: shared meals, conversation, coffee, evening companionship.
- Avoid: forced smiling group poses, corporate retreat staging.

4. Place & Texture
- Purpose: tactile quality and comfort.
- Use: interiors, materials, windows, steam, gear details.
- Avoid: hotel brochure polish and sterile luxury cliches.

### Color and Grade

- Warm/neutral color balance.
- Slightly muted tones.
- Soft shadows, natural highlights.
- Avoid cool blue casts, oversaturation, and heavy contrast.

### Lighting

Preferred:
- Early morning
- Golden hour
- Overcast daylight
- Window light
- Firelight

Avoid:
- Hard midday sun
- Studio lighting
- Flash photography

### Composition

Use:
- Negative space
- Off-center subjects
- Foreground depth
- Wide breathing frames

Avoid:
- Overly symmetrical framing
- Crowded compositions
- Tight face crops for non-portrait contexts

### Casting Guidance

- Age range target: 30-55
- Real, non-model-perfect people
- Natural diversity across body types, backgrounds, and genders
- Never stage token diversity moments

### Ratio Mix

- 40% environment
- 30% people running
- 20% connection moments
- 10% texture/details

### Hard No List

Do not use:
- Fitness stock photos
- Race photos
- Gym-style imagery
- Jumping celebration poses
- Influencer-style hero posing
- Corporate team-building visuals

### Quick Test

- Could this be a Nike ad? If yes, wrong.
- Could this be a travel magazine feature? If yes, likely right.

## Source of Truth in Code
- Token values: `app/globals.css`
- Typed brand spec: `utils/brand/brand-guidelines.ts`
- Shared button/text helpers: `utils/brand/site-brand.ts`
- Curated imagery registry: `utils/brand/imagery.ts`
- Tone guide: `docs/tone-of-voice.md`
