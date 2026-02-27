'use client'

import { useMemo, useState } from 'react'

type RouteRow = {
  name: string
  distance: string
  terrain: string
  elevation: string
  description: string
}

type EventRow = { time: string; label: string }
type DayRow = { day: string; date: string; events: EventRow[] }

type RetreatEditorValue = {
  id: string
  slug: string
  name: string
  tagline: string
  location: string
  region: string
  distance_from_city: string
  dates: string
  dates_short: string
  capacity: number
  price_from: number
  deposit: number
  hero_image: string
  hero_image_alt: string
  venue_image: string
  venue_image_alt: string
  description: string
  venue_name: string
  venue_description: string
  venue_highlights: string[]
  included: string[]
  not_included: string[]
  routes: RouteRow[]
  itinerary: DayRow[]
  status: 'upcoming' | 'open' | 'sold-out'
  seo_title: string
  seo_description: string
  seo_og_image_url: string
}

function linesToString(lines: string[]) {
  return lines.join('\n')
}

function listInput(value: string) {
  return value
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean)
}

export function RetreatEditor({ value }: { value: RetreatEditorValue }) {
  const [routes, setRoutes] = useState<RouteRow[]>(value.routes)
  const [itinerary, setItinerary] = useState<DayRow[]>(value.itinerary)
  const [highlights, setHighlights] = useState<string>(linesToString(value.venue_highlights))
  const [included, setIncluded] = useState<string>(linesToString(value.included))
  const [notIncluded, setNotIncluded] = useState<string>(linesToString(value.not_included))

  const routesJson = useMemo(() => JSON.stringify(routes), [routes])
  const itineraryJson = useMemo(() => JSON.stringify(itinerary), [itinerary])

  return (
    <>
      <input type="hidden" name="routes_json" value={routesJson} />
      <input type="hidden" name="itinerary_json" value={itineraryJson} />

      <div className="grid gap-3 md:grid-cols-2">
        <input name="name" defaultValue={value.name} placeholder="Retreat name" className="rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800" />
        <input name="slug" defaultValue={value.slug} placeholder="slug" className="rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800" />
        <input name="tagline" defaultValue={value.tagline} placeholder="Tagline" className="rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 md:col-span-2" />
        <input name="location" defaultValue={value.location} placeholder="Location" className="rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800" />
        <input name="region" defaultValue={value.region} placeholder="Region" className="rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800" />
        <input name="distance_from_city" defaultValue={value.distance_from_city} placeholder="Distance from city" className="rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800" />
        <input name="dates" defaultValue={value.dates} placeholder="Dates (long)" className="rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800" />
        <input name="dates_short" defaultValue={value.dates_short} placeholder="Dates (short)" className="rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800" />

        <input name="capacity" type="number" min={1} defaultValue={value.capacity} placeholder="Capacity" className="rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800" />
        <input name="price_from" type="number" min={0} defaultValue={value.price_from} placeholder="Price from" className="rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800" />
        <input name="deposit" type="number" min={0} defaultValue={value.deposit} placeholder="Deposit" className="rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800" />

        <select name="status" defaultValue={value.status} className="rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800">
          <option value="upcoming">Upcoming</option>
          <option value="open">Open</option>
          <option value="sold-out">Sold out</option>
        </select>
      </div>

      <div className="grid gap-3">
        <textarea name="description" defaultValue={value.description} rows={4} placeholder="Description" className="rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800" />
        <input name="hero_image" defaultValue={value.hero_image} placeholder="Hero image URL" className="rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800" />
        <input name="hero_image_alt" defaultValue={value.hero_image_alt} placeholder="Hero image alt text" className="rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800" />
        <input name="venue_name" defaultValue={value.venue_name} placeholder="Venue name" className="rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800" />
        <textarea name="venue_description" defaultValue={value.venue_description} rows={4} placeholder="Venue description" className="rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800" />
        <input name="venue_image" defaultValue={value.venue_image} placeholder="Venue image URL" className="rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800" />
        <input name="venue_image_alt" defaultValue={value.venue_image_alt} placeholder="Venue image alt text" className="rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800" />
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div>
          <p className="mb-1 text-xs font-medium text-zinc-500">Venue highlights (1 per line)</p>
          <textarea
            value={highlights}
            onChange={(e) => setHighlights(e.target.value)}
            onBlur={(e) => setHighlights(linesToString(listInput(e.target.value)))}
            name="venue_highlights"
            rows={8}
            className="w-full rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
          />
        </div>
        <div>
          <p className="mb-1 text-xs font-medium text-zinc-500">Included (1 per line)</p>
          <textarea
            value={included}
            onChange={(e) => setIncluded(e.target.value)}
            onBlur={(e) => setIncluded(linesToString(listInput(e.target.value)))}
            name="included"
            rows={8}
            className="w-full rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
          />
        </div>
        <div>
          <p className="mb-1 text-xs font-medium text-zinc-500">Not included (1 per line)</p>
          <textarea
            value={notIncluded}
            onChange={(e) => setNotIncluded(e.target.value)}
            onBlur={(e) => setNotIncluded(linesToString(listInput(e.target.value)))}
            name="not_included"
            rows={8}
            className="w-full rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
          />
        </div>
      </div>

      <div className="space-y-3 rounded border border-zinc-200 p-3 dark:border-zinc-800">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Routes</p>
          <button
            type="button"
            onClick={() => setRoutes((prev) => [...prev, { name: '', distance: '', terrain: '', elevation: '', description: '' }])}
            className="rounded border border-zinc-300 px-2 py-1 text-xs text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Add route
          </button>
        </div>

        {routes.map((route, index) => (
          <div key={index} className="grid gap-2 rounded border border-zinc-200 p-2 dark:border-zinc-700">
            <div className="grid gap-2 md:grid-cols-2">
              <input value={route.name} onChange={(e) => setRoutes((prev) => prev.map((r, i) => i === index ? { ...r, name: e.target.value } : r))} placeholder="Route name" className="rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800" />
              <input value={route.distance} onChange={(e) => setRoutes((prev) => prev.map((r, i) => i === index ? { ...r, distance: e.target.value } : r))} placeholder="Distance" className="rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800" />
              <input value={route.terrain} onChange={(e) => setRoutes((prev) => prev.map((r, i) => i === index ? { ...r, terrain: e.target.value } : r))} placeholder="Terrain" className="rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800" />
              <input value={route.elevation} onChange={(e) => setRoutes((prev) => prev.map((r, i) => i === index ? { ...r, elevation: e.target.value } : r))} placeholder="Elevation" className="rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800" />
            </div>
            <textarea value={route.description} onChange={(e) => setRoutes((prev) => prev.map((r, i) => i === index ? { ...r, description: e.target.value } : r))} rows={2} placeholder="Route description" className="rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800" />
            <button type="button" onClick={() => setRoutes((prev) => prev.filter((_, i) => i !== index))} className="w-fit rounded border border-red-300 px-2 py-1 text-xs text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-900/20">Remove route</button>
          </div>
        ))}
      </div>

      <div className="space-y-3 rounded border border-zinc-200 p-3 dark:border-zinc-800">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Itinerary</p>
          <button
            type="button"
            onClick={() => setItinerary((prev) => [...prev, { day: '', date: '', events: [] }])}
            className="rounded border border-zinc-300 px-2 py-1 text-xs text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Add day
          </button>
        </div>

        {itinerary.map((day, dayIndex) => (
          <div key={dayIndex} className="rounded border border-zinc-200 p-2 dark:border-zinc-700">
            <div className="mb-2 grid gap-2 md:grid-cols-[1fr_1fr_auto]">
              <input value={day.day} onChange={(e) => setItinerary((prev) => prev.map((d, i) => i === dayIndex ? { ...d, day: e.target.value } : d))} placeholder="Day name" className="rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800" />
              <input value={day.date} onChange={(e) => setItinerary((prev) => prev.map((d, i) => i === dayIndex ? { ...d, date: e.target.value } : d))} placeholder="Date" className="rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800" />
              <button type="button" onClick={() => setItinerary((prev) => prev.filter((_, i) => i !== dayIndex))} className="rounded border border-red-300 px-2 py-1 text-xs text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-900/20">Remove day</button>
            </div>

            <div className="space-y-2">
              {day.events.map((event, eventIndex) => (
                <div key={eventIndex} className="grid gap-2 md:grid-cols-[160px_1fr_auto]">
                  <input value={event.time} onChange={(e) => setItinerary((prev) => prev.map((d, i) => i === dayIndex ? { ...d, events: d.events.map((ev, j) => j === eventIndex ? { ...ev, time: e.target.value } : ev) } : d))} placeholder="Time" className="rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800" />
                  <input value={event.label} onChange={(e) => setItinerary((prev) => prev.map((d, i) => i === dayIndex ? { ...d, events: d.events.map((ev, j) => j === eventIndex ? { ...ev, label: e.target.value } : ev) } : d))} placeholder="Event" className="rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800" />
                  <button type="button" onClick={() => setItinerary((prev) => prev.map((d, i) => i === dayIndex ? { ...d, events: d.events.filter((_, j) => j !== eventIndex) } : d))} className="rounded border border-red-300 px-2 py-1 text-xs text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-900/20">Remove</button>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setItinerary((prev) => prev.map((d, i) => i === dayIndex ? { ...d, events: [...d.events, { time: '', label: '' }] } : d))}
              className="mt-2 rounded border border-zinc-300 px-2 py-1 text-xs text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Add event
            </button>
          </div>
        ))}
      </div>

      <div className="grid gap-3">
        <input name="seo_title" defaultValue={value.seo_title} placeholder="SEO title" className="rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800" />
        <textarea name="seo_description" defaultValue={value.seo_description} placeholder="SEO description" rows={3} className="rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800" />
        <input name="seo_og_image_url" defaultValue={value.seo_og_image_url} placeholder="SEO OG image URL" className="rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800" />
      </div>
    </>
  )
}
