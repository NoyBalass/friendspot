import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X, MapPin, Star } from 'lucide-react'
import { getAllPlacesForMap } from '../lib/places'
import { useAuthStore } from '../store/useAuthStore'
import { CategoryBadge } from './CategoryBadge'
import type { Category } from '../types'

// Leaflet CSS
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
  { value: 'all', emoji: '🗺', label: 'All' },
  { value: 'restaurant', emoji: '🍽', label: 'Food' },
  { value: 'bar', emoji: '🍸', label: 'Bars' },
  { value: 'coffee', emoji: '☕', label: 'Coffee' },
  { value: 'bakery', emoji: '🥐', label: 'Bakery' },
  { value: 'dessert', emoji: '🍦', label: 'Dessert' },
  { value: 'nightclub', emoji: '🎉', label: 'Night' },
  { value: 'other', emoji: '📍', label: 'Other' },
]

const CATEGORY_COLORS: Record<Category | 'all', string> = {
  all: '#8b5cf6',
  restaurant: '#f97316',
  bar: '#3b82f6',
  coffee: '#a16207',
  bakery: '#f59e0b',
  dessert: '#ec4899',
  nightclub: '#7c3aed',
  other: '#6b7280',
}

function makeIcon(category: Category, highlight: boolean) {
  // Lazy import L inside function to avoid SSR issues
  const L = (window as any).L
  const color = CATEGORY_COLORS[category] ?? CATEGORY_COLORS.other
  const size = highlight ? 38 : 30
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size + 8}" viewBox="0 0 ${size} ${size + 8}">
    <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2 - 2}" fill="${color}" stroke="white" stroke-width="2.5"/>
    <polygon points="${size / 2 - 5},${size - 2} ${size / 2 + 5},${size - 2} ${size / 2},${size + 7}" fill="${color}"/>
  </svg>`
  return L.divIcon({
    html: svg,
    className: '',
    iconSize: [size, size + 8],
    iconAnchor: [size / 2, size + 8],
    popupAnchor: [0, -(size + 8)],
  })
}

export function MapOverlay({ onClose }: { onClose: () => void }) {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const mapRef = useRef<any>(null)
  const mapElRef = useRef<HTMLDivElement>(null)
  const markersRef = useRef<any[]>([])
  const [places, setPlaces] = useState<MapPlace[]>([])
  const [filter, setFilter] = useState<Category | 'all'>('all')
  const [selected, setSelected] = useState<MapPlace | null>(null)
  const [loading, setLoading] = useState(true)

  // Load Leaflet script dynamically (avoid bundling it twice)
  useEffect(() => {
    async function init() {
      // Dynamic import so Leaflet only loads when map opens
      const L = await import('leaflet')
      // Fix default marker icon paths broken by bundlers
      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      })
      ;(window as any).L = L

      if (!mapElRef.current || mapRef.current) return

      const map = L.map(mapElRef.current, {
        center: [32.05, 34.78], // Tel Aviv default
        zoom: 12,
        zoomControl: false,
      })
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap',
        maxZoom: 19,
      }).addTo(map)
      L.control.zoom({ position: 'bottomright' }).addTo(map)
      mapRef.current = map

      // Load places
      if (user) {
        try {
          const data = await getAllPlacesForMap(user.id)
          setPlaces(data as MapPlace[])
        } catch {}
      }
      setLoading(false)
    }
    init()

    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  }, [])

  // Re-draw markers when places or filter changes
  useEffect(() => {
    const L = (window as any).L
    if (!mapRef.current || !L) return

    // Remove old markers
    markersRef.current.forEach(m => m.remove())
    markersRef.current = []

    const visible = filter === 'all' ? places : places.filter(p => p.category === filter)

    visible.forEach(place => {
      const isSelected = selected?.id === place.id
      const icon = makeIcon(place.category, isSelected)
      const marker = L.marker([place.latitude, place.longitude], { icon })
        .addTo(mapRef.current)
        .on('click', () => {
          setSelected(place)
          mapRef.current?.panTo([place.latitude, place.longitude], { animate: true })
        })
      markersRef.current.push(marker)
    })

    // Fit bounds if we have places and haven't manually moved
    if (visible.length > 0 && !selected) {
      const bounds = L.latLngBounds(visible.map(p => [p.latitude, p.longitude]))
      mapRef.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 })
    }
  }, [places, filter])

  // Redraw selected marker highlighted
  useEffect(() => {
    const L = (window as any).L
    if (!mapRef.current || !L) return
    markersRef.current.forEach(m => {
      const pos = m.getLatLng()
      const place = places.find(p => p.latitude === pos.lat && p.longitude === pos.lng)
      if (place) m.setIcon(makeIcon(place.category, place.id === selected?.id))
    })
  }, [selected])

  function goToPlace(place: MapPlace) {
    onClose()
    navigate(`/group/${place.group_id}/place/${place.id}`)
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col bg-white"
      style={{ top: 0 }}
    >
      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 pt-12 pb-3 bg-gradient-to-b from-white/95 to-transparent pointer-events-none">
        <div className="flex items-center gap-2 pointer-events-auto">
          <div className="bg-white/90 backdrop-blur-sm rounded-full px-3 py-1.5 shadow-sm border border-gray-100 flex items-center gap-1.5">
            <MapPin size={14} className="text-violet-500" />
            <span className="text-sm font-semibold text-gray-800">
              {loading ? 'Loading…' : `${places.length} spots`}
            </span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="pointer-events-auto w-9 h-9 rounded-full bg-white/90 backdrop-blur-sm shadow-sm border border-gray-100 flex items-center justify-center text-gray-500 hover:text-gray-800 transition-colors"
        >
          <X size={18} />
        </button>
      </div>

      {/* Category filter chips */}
      <div className="absolute top-24 left-0 right-0 z-10 px-3 pointer-events-none">
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide pointer-events-auto">
          {CATEGORY_FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => { setFilter(f.value); setSelected(null) }}
              className={`whitespace-nowrap flex items-center gap-1 text-xs px-3 py-1.5 rounded-full border transition-all font-medium shadow-sm ${
                filter === f.value
                  ? 'bg-violet-500 border-violet-500 text-white'
                  : 'bg-white/90 backdrop-blur-sm border-gray-200 text-gray-600'
              }`}
            >
              {f.emoji} {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Map */}
      <div ref={mapElRef} className="flex-1 w-full" />

      {/* Loading spinner */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/60 z-10">
          <div className="w-7 h-7 rounded-full border-2 border-violet-200 border-t-violet-500 animate-spin" />
        </div>
      )}

      {/* Empty state */}
      {!loading && places.length === 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 pointer-events-none">
          <div className="text-4xl">🗺</div>
          <p className="text-sm text-gray-400 text-center px-8">
            No places with location data yet. Add places via Google Maps search to see them here.
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
            className="absolute bottom-6 left-4 right-4 z-10"
          >
            <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
              <button
                onClick={() => goToPlace(selected)}
                className="w-full p-4 text-left flex items-start gap-3 active:bg-gray-50 transition-colors"
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-lg"
                  style={{ background: `${CATEGORY_COLORS[selected.category]}20` }}
                >
                  {CATEGORY_FILTERS.find(f => f.value === selected.category)?.emoji ?? '📍'}
                </div>
                <div className="flex-1 min-w-0">
                  <p dir="auto" className="font-semibold text-gray-900 text-base leading-tight truncate">{selected.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5 truncate">
                    {selected.cuisine ? `${selected.cuisine} · ` : ''}{selected.group_name}
                  </p>
                  {selected.avg_rating != null && (
                    <div className="flex items-center gap-1 mt-1">
                      {[1,2,3,4,5].map(s => (
                        <Star key={s} size={11} className={s <= Math.round(selected.avg_rating!) ? 'text-amber-400 fill-amber-400' : 'text-gray-200 fill-gray-200'} />
                      ))}
                      <span className="text-xs text-gray-400">{selected.avg_rating.toFixed(1)}</span>
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <CategoryBadge category={selected.category} small />
                  <span className="text-xs text-violet-500 font-medium">View →</span>
                </div>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tap map to deselect */}
      {selected && (
        <div
          className="absolute inset-0 z-[5]"
          onClick={(e) => { if (e.target === e.currentTarget) setSelected(null) }}
        />
      )}
    </motion.div>
  )
}
