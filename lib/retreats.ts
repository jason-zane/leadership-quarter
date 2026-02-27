import { brandImagery } from '@/utils/brand/imagery'

export type Route = {
  name: string
  distance: string
  terrain: string
  elevation: string
  description: string
}

export type ItineraryEvent = {
  time: string
  label: string
}

export type ItineraryDay = {
  day: string
  date: string
  events: ItineraryEvent[]
}

export type Retreat = {
  slug: string
  name: string
  tagline: string
  location: string
  region: string
  distanceFromCity: string
  dates: string
  datesShort: string
  capacity: number
  priceFrom: number
  deposit: number
  heroImage: string
  heroImageAlt: string
  venueImage: string
  venueImageAlt: string
  venueGallery?: Array<{ src: string; alt: string }>
  description: string
  venueName: string
  venueDescription: string
  venueHighlights: string[]
  mapEmbedUrl?: string
  mapLabel?: string
  routes: Route[]
  itinerary: ItineraryDay[]
  included: string[]
  notIncluded: string[]
  status: 'upcoming' | 'open' | 'sold-out'
}

export const retreats: Retreat[] = [
  {
    slug: 'sydney-southern-highlands',
    name: 'The Southern Highlands',
    tagline: 'Ninety minutes from Sydney, and a full mental reset.',
    location: 'Bargo, NSW',
    region: 'Southern Highlands',
    distanceFromCity: '~90 min drive from Sydney CBD',
    dates: '24–27 September 2026',
    datesShort: 'September 2026',
    capacity: 12,
    priceFrom: 5899,
    deposit: 500,
    heroImage: brandImagery.retreats.southernHighlandsHero.src,
    heroImageAlt: brandImagery.retreats.southernHighlandsHero.alt,
    venueImage: brandImagery.retreats.southernHighlandsVenue.src,
    venueImageAlt: brandImagery.retreats.southernHighlandsVenue.alt,
    venueGallery: [
      {
        src: brandImagery.retreats.southernHighlandsVenue.src,
        alt: brandImagery.retreats.southernHighlandsVenue.alt,
      },
      {
        src: 'https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=1200&q=80',
        alt: 'Private bedroom with warm natural styling',
      },
      {
        src: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=1200&q=80',
        alt: 'Outdoor pool and deck with trees surrounding the property',
      },
      {
        src: 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=1200&q=80',
        alt: 'Warm bedroom interior with natural materials and soft light',
      },
    ],
    description:
      'Three nights in a private estate near Nattai National Park. Guided trail runs each morning, open recovery blocks each afternoon, and shared dinners every evening.',
    venueName: 'Kalinya Estate',
    venueDescription:
      'A private country estate in Bargo with room for the full retreat group. Two buildings, private rooms, gardens, pool, and spa. Close access to varied trails means less travel time and more time actually running.',
    venueHighlights: [
      '6-acre estate with award-winning gardens',
      '17-metre heated swimming pool',
      'Therapeutic spa',
      'Two buildings: The Homestead and The Lodge',
      'Exclusive use for retreat guests only',
      'Tennis court and outdoor recreation areas',
    ],
    mapLabel: 'Kalinya Estate, 60 Great Southern Road, Bargo NSW 2574',
    mapEmbedUrl:
      'https://www.google.com/maps?q=-34.2757429,150.5778335&z=15&output=embed',
    routes: [
      {
        name: 'The Nattai Circuit',
        distance: '10–18 km',
        terrain: 'Single trail, sandstone track, river flats',
        elevation: '250–350 m gain',
        description:
          'A rolling trail loop through heathland and river sections with two distance options depending on your pace and morning energy.',
      },
      {
        name: 'The Escarpment',
        distance: '15–25 km',
        terrain: 'Technical trail, ridgeline, fire road sections',
        elevation: '500–700 m gain',
        description:
          'The longest route of the weekend. Climbing sections, open ridgeline views, and optional turn points so you can hold conversational effort.',
      },
      {
        name: 'Estate Morning',
        distance: '5–8 km',
        terrain: 'Estate paths and quiet country lanes',
        elevation: 'Flat to gentle',
        description:
          'An easy final run through estate tracks and nearby lanes before breakfast and departure.',
      },
    ],
    itinerary: [
      {
        day: 'Thursday',
        date: '24 September',
        events: [
          { time: '9:00 am', label: 'Coach departs Sydney CBD' },
          { time: '12:00 pm', label: 'Arrive at Kalinya Estate, settle in, lunch' },
          { time: '3:00 pm', label: 'Arrival coffee and group introductions' },
          { time: '6:00 pm', label: 'Welcome dinner, long table style' },
          { time: '8:30 pm', label: 'Sunset walk through the gardens' },
        ],
      },
      {
        day: 'Friday',
        date: '25 September',
        events: [
          { time: '6:00 am', label: 'Pre-run coffee, then morning run: The Nattai Circuit (10–18 km)' },
          { time: '8:30 am', label: 'Return to estate, showers, full breakfast' },
          { time: '9:30 am', label: 'Practical session: kit, shoes, trail prep' },
          { time: '12:00 pm', label: 'Lunch' },
          { time: '3:00 pm', label: 'Open afternoon: pool, spa, gardens, tennis' },
          { time: '6:00 pm', label: 'Dinner with nutrition session' },
        ],
      },
      {
        day: 'Saturday',
        date: '26 September',
        events: [
          { time: '6:00 am', label: 'Pre-run coffee, then long run: The Escarpment (15–25 km)' },
          { time: '9:00 am', label: 'Guest session or extra guided route option' },
          { time: '11:30 am', label: 'Late brunch' },
          { time: '3:00 pm', label: 'Open afternoon: pool, spa, rest, games' },
          { time: '6:00 pm', label: 'Casual long-table dinner' },
        ],
      },
      {
        day: 'Sunday',
        date: '27 September',
        events: [
          { time: '6:00 am', label: 'Optional sunrise run: Estate Morning (5–8 km)' },
          { time: '8:00 am', label: 'Farewell breakfast' },
          { time: '9:30 am', label: 'Closing session and next retreat preview' },
          { time: '12:00 pm', label: 'Farewell lunch' },
          { time: '3:00 pm', label: 'Coach departs for Sydney' },
        ],
      },
    ],
    included: [
      '3 nights exclusive accommodation at Kalinya Estate',
      'All meals: Thursday dinner through Sunday lunch',
      '3 guided runs with experienced run leaders',
      'Daily heated pool and spa access',
      'Guided recovery session Saturday afternoon',
      'Welcome drinks and non-alcoholic beverages throughout',
      'Pre-run coffee each morning',
      'Route maps and weekend programme booklet',
      'Transport to and from trailheads',
    ],
    notIncluded: [
      'Transport to/from Bargo (Sydney coach available, $65 return)',
      'Wine and alcoholic beverages',
      'Travel insurance',
      'Personal running gear or equipment',
    ],
    status: 'upcoming',
  },
]

export function getRetreat(slug: string): Retreat | undefined {
  return retreats.find((r) => r.slug === slug)
}
