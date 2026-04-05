import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, MapPin, Globe, ExternalLink, Search, ImagePlus } from 'lucide-react'
import { createPlace, createReview, uploadPlaceCoverPhoto } from '../lib/places'
import { getGroupById } from '../lib/groups'
import { StarRating } from '../components/StarRating'
import { useAuthStore } from '../store/useAuthStore'
import type { Category, GroupType } from '../types'

const CATEGORIES: { value: Category; label: string; emoji: string }[] = [
  { value: 'restaurant', label: 'Restaurant', emoji: '🍽' },
  { value: 'bar', label: 'Bar', emoji: '🍸' },
  { value: 'coffee', label: 'Coffee', emoji: '☕' },
  { value: 'other', label: 'Other', emoji: '📍' },
]

interface NominatimResult {
  place_id: number
  display_name: string
  name: string
  lat: string
  lon: string
  address?: { road?: string; city?: string; country?: string }
}

export function AddPlacePage() {
  const { groupId } = useParams<{ groupId: string }>()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [groupType, setGroupType] = useState<GroupType>('all')

  useEffect(() => {
    if (groupId) getGroupById(groupId).then(g => {
      const t = g.type ?? 'all'
      setGroupType(t)
      if (t !== 'all') setCategory(t as Category)
    }).catch(() => {})
  }, [groupId])

  const isSpecificType = groupType !== 'all'
  const availableCategories = isSpecificType
    ? CATEGORIES.filter(c => c.value === groupType)
    : CATEGORIES

  const [name, setName] = useState('')
  const [category, setCategory] = useState<Category>('restaurant')
  const [cuisine, setCuisine] = useState('')
  const [mapsSearch, setMapsSearch] = useState('')
  const [instagram, setInstagram] = useState('')
  const [wolt, setWolt] = useState('')
  const [tabit, setTabit] = useState('')
  const [website, setWebsite] = useState('')
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const [rating, setRating] = useState(0)
  const [reviewText, setReviewText] = useState('')
  const [saving, setSaving] = useState(false)

  // Autocomplete state
  const [suggestions, setSuggestions] = useState<NominatimResult[]>([])
  const [searching, setSearching] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function handleNameChange(value: string) {
    setName(value)
    if (searchTimer.current) clearTimeout(searchTimer.current)
    if (value.length < 2) { setSuggestions([]); setShowSuggestions(false); return }
    setSearching(true)
    searchTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(value)}&format=json&limit=5&addressdetails=1`,
          { headers: { 'Accept-Language': 'en' } }
        )
        const data: NominatimResult[] = await res.json()
        setSuggestions(data)
        setShowSuggestions(data.length > 0)
      } catch {}
      setSearching(false)
    }, 400)
  }

  function selectSuggestion(item: NominatimResult) {
    const placeName = item.name || item.display_name.split(',')[0]
    setName(placeName)
    // Build a precise maps search from the full display name
    setMapsSearch(item.display_name)
    setSuggestions([])
    setShowSuggestions(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const place = await createPlace({
        group_id: groupId!,
        name,
        category,
        cuisine: cuisine || undefined,
        google_maps_url: mapsSearch
          ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapsSearch)}`
          : undefined,
        instagram_url: instagram || undefined,
        wolt_url: wolt || undefined,
        tabit_url: tabit || undefined,
        website_url: website || undefined,
        added_by: user!.id,
      })

      if (coverFile) {
        await uploadPlaceCoverPhoto(place.id, coverFile)
      }

      if (rating > 0) {
        await createReview({
          place_id: place.id,
          user_id: user!.id,
          rating,
          text: reviewText || undefined,
        })
      }

      navigate(`/group/${groupId}/place/${place.id}`)
    } catch (err: any) {
      alert(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-svh bg-[#fafaf8] pb-16">
      {/* Header */}
      <div className="sticky top-0 bg-[#fafaf8]/90 backdrop-blur-md z-10 px-5 pt-12 pb-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-gray-700 transition-colors">
            <ChevronLeft size={22} />
          </button>
          <h1 className="text-xl font-semibold text-gray-900">Add a place</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="px-5 flex flex-col gap-5">
        {/* Name with autocomplete */}
        <div ref={wrapperRef} className="relative">
          <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 block">Place name</label>
          <div className="flex items-center bg-white border border-gray-200 rounded-xl px-3 focus-within:border-violet-300 transition-colors">
            <Search size={15} className="text-gray-300 shrink-0" />
            <input
              type="text"
              placeholder="e.g. The Alchemist Tel Aviv"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
              required
              className="flex-1 px-3 py-3 text-sm outline-none bg-transparent placeholder:text-gray-300"
            />
            {searching && (
              <div className="w-3.5 h-3.5 rounded-full border-2 border-violet-200 border-t-violet-500 animate-spin shrink-0" />
            )}
          </div>

          {/* Suggestions dropdown */}
          <AnimatePresence>
            {showSuggestions && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-100 rounded-2xl shadow-lg z-50 overflow-hidden"
              >
                {suggestions.map((item) => {
                  const placeName = item.name || item.display_name.split(',')[0]
                  const subtitle = item.display_name.split(',').slice(1, 3).join(',').trim()
                  return (
                    <button
                      key={item.place_id}
                      type="button"
                      onClick={() => selectSuggestion(item)}
                      className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0"
                    >
                      <MapPin size={14} className="text-violet-400 mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{placeName}</p>
                        <p className="text-xs text-gray-400 truncate">{subtitle}</p>
                      </div>
                    </button>
                  )
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Category — only shown for mixed groups */}
        {!isSpecificType && (
          <div>
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 block">Category</label>
            <div className="flex gap-2 flex-wrap">
              {availableCategories.map((cat) => (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => setCategory(cat.value)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
                    category === cat.value
                      ? 'bg-violet-500 text-white border-violet-500'
                      : 'bg-white text-gray-500 border-gray-200'
                  }`}
                >
                  {cat.emoji} {cat.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Cuisine */}
        <div>
          <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 block">Cuisine / type</label>
          <input
            type="text"
            placeholder="e.g. Italian, Sushi, Cocktails..."
            value={cuisine}
            onChange={(e) => setCuisine(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-violet-300 bg-white placeholder:text-gray-300"
          />
        </div>

        {/* Links */}
        <div>
          <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 block">Links</label>
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl px-3 focus-within:border-violet-300 transition-colors">
              <MapPin size={15} className="text-blue-400 shrink-0" />
              <input
                type="text"
                placeholder="Google Maps location (auto-filled from name)"
                value={mapsSearch}
                onChange={(e) => setMapsSearch(e.target.value)}
                className="flex-1 py-3 text-sm outline-none bg-transparent placeholder:text-gray-300"
              />
            </div>
            {[
              { icon: ExternalLink, placeholder: 'Instagram profile URL', value: instagram, set: setInstagram, color: 'text-pink-400' },
              { icon: ExternalLink, placeholder: 'Wolt URL', value: wolt, set: setWolt, color: 'text-sky-400' },
              { icon: ExternalLink, placeholder: 'Tabit URL', value: tabit, set: setTabit, color: 'text-orange-400' },
              { icon: Globe, placeholder: 'Website', value: website, set: setWebsite, color: 'text-gray-400' },
            ].map(({ icon: Icon, placeholder, value, set, color }) => (
              <div key={placeholder} className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl px-3">
                <Icon size={15} className={color} />
                <input
                  type="url"
                  placeholder={placeholder}
                  value={value}
                  onChange={(e) => set(e.target.value)}
                  className="flex-1 py-3 text-sm outline-none bg-transparent placeholder:text-gray-300"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Cover photo */}
        <div>
          <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 block">Cover photo</label>
          <label className="relative block cursor-pointer group">
            <div className="w-full h-28 rounded-xl overflow-hidden bg-white border border-gray-200 border-dashed flex items-center justify-center">
              {coverPreview ? (
                <img src={coverPreview} alt="cover" className="w-full h-full object-cover" />
              ) : (
                <div className="flex flex-col items-center gap-1 text-gray-300 group-hover:text-violet-400 transition-colors">
                  <ImagePlus size={22} />
                  <span className="text-xs">Upload cover photo (optional)</span>
                </div>
              )}
              {coverPreview && (
                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-xl">
                  <ImagePlus size={20} className="text-white" />
                </div>
              )}
            </div>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (!file) return
                setCoverFile(file)
                setCoverPreview(URL.createObjectURL(file))
              }}
            />
          </label>
        </div>

        {/* Initial review */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3 block">Your review</label>
          <StarRating value={rating} onChange={setRating} size="lg" />
          <textarea
            placeholder="What did you think? (optional)"
            value={reviewText}
            onChange={(e) => setReviewText(e.target.value)}
            rows={3}
            className="w-full mt-3 px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-violet-300 bg-gray-50 placeholder:text-gray-300 resize-none"
          />
        </div>

        <motion.button
          whileTap={{ scale: 0.97 }}
          type="submit"
          disabled={saving || !name}
          className="w-full py-3.5 rounded-2xl bg-violet-500 text-white text-sm font-semibold hover:bg-violet-600 active:scale-95 transition-all disabled:opacity-50 shadow-sm shadow-violet-200"
        >
          {saving ? '...' : 'Add place'}
        </motion.button>
      </form>
    </div>
  )
}
