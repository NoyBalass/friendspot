import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Search, MapPin, Star } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { searchAllPlaces } from '../lib/places'
import { useAuthStore } from '../store/useAuthStore'
import { CategoryBadge } from './CategoryBadge'

interface Props {
  open: boolean
  onClose: () => void
}

export function SearchOverlay({ open, onClose }: Props) {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 150)
    else { setQuery(''); setResults([]) }
  }, [open])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!query.trim() || !user) { setResults([]); return }
    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const data = await searchAllPlaces(user.id, query)
        setResults(data)
      } catch {}
      setLoading(false)
    }, 300)
  }, [query])

  function go(place: any) {
    onClose()
    navigate(`/group/${place.group_id}/place/${place.id}`)
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 z-[65]"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            transition={{ type: 'spring', damping: 30, stiffness: 400 }}
            className="fixed top-14 left-0 right-0 z-[66] bg-white shadow-xl max-h-[75svh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Search input */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
              <Search size={16} className="text-gray-400 shrink-0" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search all your places…"
                className="flex-1 text-sm outline-none placeholder:text-gray-300"
              />
              {query && (
                <button onClick={() => setQuery('')} className="text-gray-300 hover:text-gray-500">
                  <X size={15} />
                </button>
              )}
            </div>

            {/* Results */}
            <div className="overflow-y-auto flex-1">
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="w-5 h-5 rounded-full border-2 border-violet-200 border-t-violet-500 animate-spin" />
                </div>
              ) : results.length === 0 && query.trim() ? (
                <p className="text-center text-sm text-gray-400 py-8">No places found for "{query}"</p>
              ) : results.length === 0 ? (
                <p className="text-center text-sm text-gray-300 py-8">Type to search across all your groups</p>
              ) : (
                <div className="divide-y divide-gray-50">
                  {results.map((place) => (
                    <button
                      key={place.id}
                      onClick={() => go(place)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-violet-50 transition-colors text-left"
                    >
                      <div className="w-11 h-11 rounded-xl overflow-hidden bg-violet-50 shrink-0">
                        {place.cover_photo
                          ? <img src={place.cover_photo} alt={place.name} className="w-full h-full object-cover" />
                          : <div className="w-full h-full flex items-center justify-center"><MapPin size={16} className="text-violet-300" /></div>
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p dir="auto" className="text-sm font-medium text-gray-900 truncate">{place.name}</p>
                        <p className="text-xs text-gray-400 truncate">
                          {place.cuisine ? `${place.cuisine} · ` : ''}{place.group_name}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {place.avg_rating != null && (
                          <span className="flex items-center gap-0.5 text-xs text-amber-500 font-medium">
                            <Star size={10} className="fill-amber-400" />
                            {place.avg_rating.toFixed(1)}
                          </span>
                        )}
                        <CategoryBadge category={place.category} small />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
