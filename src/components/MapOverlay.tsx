import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X, MapPin, Star } from 'lucide-react'
import { getAllPlacesForMap } from '../lib/places'
import { useAuthStore } from '../store/useAuthStore'
import { CategoryBadge } from './CategoryBadge'
import type { Category } from '../types'

import 'leaflet/dist/leaflet.css'

type MapPlace = {
  id: string
  name: string
  category: Category
  cuisine?: string
  group_id: string
  group_name: string
  latitude: number
  longitude: number
  avg_rating: number | null
}

const CATEGORY_FILTERS: { value: Category | 'all'; emoji: string; label: string }[] = [
  { value: 'all',        emoji: '🗺',  label: 'All'     },
  { value: 'restaurant', emoji: '🍽',  label: 'Food'    },
  { value: 'bar',        emoji: '🍸',  label: 'Bars'    },
  { value: 'coffee',     emoji: '☕',  label: 'Coffee'  },
  { value: 'bakery',     emoji: '🥐',  label: 'Bakery'  },
  { value: 'dessert',    emoji: '🍦',  label: 'Dessert' },
  { value: 'nightclub',  emoji: '🎉',  label: 'Night'   },
  { value: 'other',      emoji: '📍',  label: 'Other'   },
]

const CATEGORY_COLORS: Record<string, string> = {
  all:        '#8b5cf6',
  restaurant: '#f97316',
  bar:        '#3b82f6',
  coffee:     '#a16207',
  bakery:     '#f59e0b',
  dessert:    '#ec4899',
  nightclub:  '#7c3aed',
  other:      '#6b7280',
}

function makeIcon(L: any, category: Category, highlight: boolean) {
  const color = CATEGORY_COLORS[category] ?? CATEGORY_COLORS.other
  const size = highlight ? 36 : 28
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size + 8}" viewBox="0 0 ${size} ${size + 8}">
    <circle cx="${size/2}" cy="${size/2}" r="${size/2 - 2}" fill="${color}" stroke="white" stroke-width="2.5"/>
    <polygon points="${size/2-5},${size-2} ${size/2+5},${size-2} ${size/2},${size+7}" fill="${color}"/>
  </svg>`
  return L.divIcon({
    html: svg,
    className: '',
    iconSize:   [size, size + 8],
    iconAnchor: [size / 2, size + 8],
  })
}

export function MapOverlay({ onClose }: { onClose: () => void }) {
  const { user } = useAuthStore()
  const navigate = useNavigate()

  const mapRef    = useRef<any>(null)
  const mapElRef  = useRef<HTMLDivElement>(null)
  const LRef      = useRef<any>(null)
  const markersRef = useRef<any[]>([])

  const [places,   setPlaces]   = useState<MapPlace[]>([])
  const [filter,   setFilter]   = useState<Category | 'all'>('all')
  const [selected, setSelected] = useState<MapPlace | null>(null)
  const [loading,  setLoading]  = useState(true)

  // ── Init Leaflet once ──────────────────────────────────────────
  useEffect(() => {
    let cancelled = false
    async function init() {
      const L = await import('leaflet')
      if (cancelled) return
      LRef.current = L

      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      })

      if (!mapElRef.current || mapRef.current) return

      const map = L.map(mapElRef.current, {
        center: [32.05, 34.78],
        zoom: 12,
        zoomControl: false,
      })
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap',
        maxZoom: 19,
      }).addTo(map)
      L.control.zoom({ position: 'bottomright' }).addTo(map)
      mapRef.current = map

      // Force Leaflet to recalc size after DOM is stable
      setTimeout(() => map.invalidateSize(), 100)

      if (user) {
        try {
          const data = await getAllPlacesForMap(user.id)
          if (!cancelled) setPlaces(data as MapPlace[])
        } catch {}
      }
      if (!cancelled) setLoading(false)
    }
    init()
    return () => {
      cancelled = true
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null }
    }
  }, [])

  // ── Redraw markers whenever places / filter change ─────────────
  useEffect(() => {
    const L = LRef.current
    if (!mapRef.current || !L) return

    markersRef.current.forEach(m => m.remove())
    markersRef.current = []

    const visible = filter === 'all' ? places : places.filter(p => p.category === filter)

    visible.forEach(place => {
      const marker = L.marker(
        [place.latitude, place.longitude],
        { icon: makeIcon(L, place.category, selected?.id === place.id) }
      )
        .addTo(mapRef.current)
        .on('click', () => {
          setSelected(place)
          mapRef.current?.panTo([place.latitude, place.longitude], { animate: true })
        })
      markersRef.current.push(marker)
    })

    if (visible.length > 0 && !selected) {
      const bounds = L.latLngBounds(visible.map(p => [p.latitude, p.longitude]))
      mapRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 })
    }
  }, [places, filter])

  // ── Re-style selected marker ───────────────────────────────────
  useEffect(() => {
    const L = LRef.current
    if (!L) return
    markersRef.current.forEach(m => {
      const { lat, lng } = m.getLatLng()
      const place = places.find(p => p.latitude === lat && p.longitude === lng)
      if (place) m.setIcon(makeIcon(L, place.category, place.id === selected?.id))
    })
  }, [selected])

  function goToPlace(place: MapPlace) {
    onClose()
    navigate(`/group/${place.group_id}/place/${place.id}`)
  }

  const visibleCount = filter === 'all' ? places.length : places.filter(p => p.category === filter).length

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col bg-white"
    >
      {/* ── Top bar (solid, not overlaid) ── */}
      <div className="shrink-0 flex items-center justify-between px-4 bg-white border-b border-gray-100 shadow-sm"
        style={{ paddingTop: 'env(safe-area-inset-top, 12px)', paddingBottom: '10px', minHeight: 56 }}>
        <div className="flex items-center gap-2">
          <MapPin size={15} className="text-violet-500" />
          <span className="text-sm font-semibold text-gray-800">
            {loading ? 'Loading…' : `${visibleCount} spot${visibleCount !== 1 ? 's' : ''}`}
          </span>
        </div>
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      {/* ── Category filter chips (solid row) ── */}
      <div className="shrink-0 flex gap-2 px-3 py-2.5 overflow-x-auto bg-white border-b border-gray-100" style={{ scrollbarWidth: 'none' }}>
        {CATEGORY_FILTERS.map(f => (
          <button
            key={f.value}
            onClick={() => { setFilter(f.value); setSelected(null) }}
            className={`whitespace-nowrap flex items-center gap-1 text-xs px-3 py-1.5 rounded-full border transition-all font-medium ${
              filter === f.value
                ? 'bg-violet-500 border-violet-500 text-white'
                : 'bg-white border-gray-200 text-gray-600'
            }`}
          >
            {f.emoji} {f.label}
          </button>
        ))}
      </div>

      {/* ── Map (takes all remaining space) ── */}
      <div className="relative flex-1 min-h-0">
        <div ref={mapElRef} className="absolute inset-0" />

        {/* Loading */}
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/70 z-10">
            <div className="w-7 h-7 rounded-full border-2 border-violet-200 border-t-violet-500 animate-spin" />
          </div>
        )}

        {/* Empty state */}
        {!loading && places.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-8 z-10 pointer-events-none">
            <div className="text-4xl">🗺</div>
            <p className="text-sm text-gray-400 text-center">
              No mapped places yet. Add places via Google Maps search to pin them here.
            </p>
          </div>
        )}

        {/* Selected place card */}
        <AnimatePresence>
          {selected && (
            <motion.div
              key={selected.id}
              initial={{ y: 80, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 80, opacity: 0 }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
              className="absolute bottom-5 left-4 right-4 z-20"
            >
              <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden">
                <button
                  onClick={() => goToPlace(selected)}
                  className="w-full p-4 text-left flex items-start gap-3 active:bg-gray-50 transition-colors"
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-xl"
                    style={{ background: `${CATEGORY_COLORS[selected.category]}18` }}
                  >
                    {CATEGORY_FILTERS.find(f => f.value === selected.category)?.emoji ?? '📍'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p dir="auto" className="font-semibold text-gray-900 text-base leading-tight truncate">
                      {selected.name}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5 truncate">
                      {selected.cuisine ? `${selected.cuisine} · ` : ''}{selected.group_name}
                    </p>
                    {selected.avg_rating != null && (
                      <div className="flex items-center gap-0.5 mt-1">
                        {[1,2,3,4,5].map(s => (
                          <Star key={s} size={11}
                            className={s <= Math.round(selected.avg_rating!) ? 'text-amber-400 fill-amber-400' : 'text-gray-200 fill-gray-200'} />
                        ))}
                        <span className="text-xs text-gray-400 ml-1">{selected.avg_rating.toFixed(1)}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <CategoryBadge category={selected.category} small />
                    <span className="text-xs text-violet-500 font-medium">View →</span>
                  </div>
                </button>
              </div>
              {/* Dismiss */}
              <button
                onClick={() => setSelected(null)}
                className="absolute -top-3 right-5 w-6 h-6 rounded-full bg-white border border-gray-200 shadow flex items-center justify-center text-gray-400"
              >
                <X size={12} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
