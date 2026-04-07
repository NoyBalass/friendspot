import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, MapPin, Search, ImagePlus, Camera, X, Check, Link } from 'lucide-react'
import { createPlace, createReview, uploadPlaceCoverPhoto, uploadReviewPhoto } from '../lib/places'
import { getGroupById } from '../lib/groups'
import { StarRating } from '../components/StarRating'
import { useAuthStore } from '../store/useAuthStore'
import type { Category, GroupType } from '../types'

const CATEGORIES: { value: Category; label: string; emoji: string }[] = [
  { value: 'restaurant', label: 'Restaurant', emoji: '🍽' },
  { value: 'bar', label: 'Bar', emoji: '🍸' },
  { value: 'coffee', label: 'Coffee', emoji: '☕' },
  { value: 'bakery', label: 'Bakery', emoji: '🥐' },
  { value: 'dessert', label: 'Dessert', emoji: '🍦' },
  { value: 'nightclub', label: 'Nightclub', emoji: '🎉' },
  { value: 'other', label: 'Other', emoji: '📍' },
]

const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_PLACES_API_KEY as string

interface Suggestion {
  placeId: string
  mainText: string
  secondaryText: string
}

async function getPlacePredictions(input: string, isHebrew: boolean): Promise<Suggestion[]> {
  const res = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': GOOGLE_API_KEY,
    },
    body: JSON.stringify({
      input,
      languageCode: isHebrew ? 'he' : 'en',
      includedRegionCodes: ['il'],
      locationBias: {
        circle: { center: { latitude: 31.5, longitude: 34.85 }, radius: 50000 },
      },
    }),
  })
  const data = await res.json()
  if (!res.ok || data.error) throw new Error(data.error?.message ?? 'Places API error')
  return (data.suggestions ?? [])
    .filter((s: any) => s.placePrediction)
    .map((s: any) => ({
      placeId: s.placePrediction.placeId,
      mainText: s.placePrediction.structuredFormat?.mainText?.text ?? s.placePrediction.text?.text ?? '',
      secondaryText: s.placePrediction.structuredFormat?.secondaryText?.text ?? '',
    }))
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
  const [mapsUrl, setMapsUrl] = useState('')          // final google maps URL stored in DB
  const [linkedPlaceId, setLinkedPlaceId] = useState('')  // google place_id when confirmed
  const [address, setAddress] = useState('')           // from Google Places secondaryText
  const [instagramUrl, setInstagramUrl] = useState('')
  const [isManualMode, setIsManualMode] = useState(false)
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const [googlePhotoUrl, setGooglePhotoUrl] = useState<string | null>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const [rating, setRating] = useState(0)
  const [reviewText, setReviewText] = useState('')
  const [reviewPhotoFile, setReviewPhotoFile] = useState<File | null>(null)
  const [reviewPhotoPreview, setReviewPhotoPreview] = useState<string | null>(null)
  const reviewPhotoRef = useRef<HTMLInputElement>(null)
  const reviewCameraRef = useRef<HTMLInputElement>(null)
  const [saving, setSaving] = useState(false)

  // Autocomplete
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [searching, setSearching] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const photoFetchToken = useRef<string>('')  // race condition guard

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Cleanup debounce timer on unmount
  useEffect(() => () => { if (searchTimer.current) clearTimeout(searchTimer.current) }, [])

  function handleNameChange(value: string) {
    setName(value)
    setLinkedPlaceId('')   // user is editing manually — unlink
    setMapsUrl('')
    setAddress('')
    photoFetchToken.current = ''
    setGooglePhotoUrl(null)
    if (!coverFile) setCoverPreview(null)
    if (searchTimer.current) clearTimeout(searchTimer.current)
    // always reset spinner on any early exit
    if (isManualMode) { setSearching(false); return }
    if (value.length < 2) { setSearching(false); setSuggestions([]); setShowSuggestions(false); return }
    if (!GOOGLE_API_KEY) { setSearching(false); return }
    setSearching(true)
    searchTimer.current = setTimeout(async () => {
      try {
        const isHebrew = /[\u0590-\u05FF]/.test(value)
        const items = await getPlacePredictions(value, isHebrew)
        setSuggestions(items)
        setShowSuggestions(items.length > 0)
      } catch (err) {
        console.error('Places autocomplete error:', err)
      } finally {
        setSearching(false)
      }
    }, 350)
  }

  function enterManualMode() {
    setIsManualMode(true)
    setSuggestions([])
    setShowSuggestions(false)
    setSearching(false)
    if (searchTimer.current) clearTimeout(searchTimer.current)
  }

  async function selectSuggestion(item: Suggestion) {
    if (searchTimer.current) clearTimeout(searchTimer.current)
    setSearching(false)
    setSuggestions([])
    setShowSuggestions(false)
    setName(item.mainText)
    setLinkedPlaceId(item.placeId)
    setAddress(item.secondaryText)
    setMapsUrl(`https://www.google.com/maps/place/?q=place_id:${item.placeId}`)
    // Clear previous Google photo immediately so stale image doesn't linger
    if (!coverFile) { setGooglePhotoUrl(null); setCoverPreview(null) }
    fetchGooglePhoto(item.placeId)
  }

  async function fetchGooglePhoto(placeId: string) {
    if (!GOOGLE_API_KEY) return
    const token = placeId
    photoFetchToken.current = token
    try {
      const res = await fetch(`https://places.googleapis.com/v1/places/${placeId}`, {
        headers: { 'X-Goog-Api-Key': GOOGLE_API_KEY, 'X-Goog-FieldMask': 'photos' },
      })
      const data = await res.json()
      const photoName = data.photos?.[0]?.name
      if (!photoName || photoFetchToken.current !== token) return

      const mediaRes = await fetch(
        `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=800&skipHttpRedirect=true&key=${GOOGLE_API_KEY}`
      )
      const mediaData = await mediaRes.json()
      const url = mediaData.photoUri as string | undefined
      if (!url || photoFetchToken.current !== token) return

      setGooglePhotoUrl(url)
      // Only set as preview if the user hasn't manually uploaded their own photo
      setCoverPreview(prev => coverFile ? prev : url)
    } catch {}
  }

  function clearLink() {
    setLinkedPlaceId('')
    setMapsUrl('')
    setAddress('')
    setGooglePhotoUrl(null)
    setCoverPreview(prev => (prev === googlePhotoUrl ? null : prev))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (reviewPhotoFile && rating === 0) {
      alert('Please add a star rating to include a photo with your review.')
      return
    }
    setSaving(true)
    try {
      const place = await createPlace({
        group_id: groupId!,
        name,
        category,
        cuisine: cuisine || undefined,
        address: address || undefined,
        google_maps_url: mapsUrl || undefined,
        instagram_url: instagramUrl || undefined,
        cover_photo: !coverFile ? (googlePhotoUrl || undefined) : undefined,
        added_by: user!.id,
      })

      if (coverFile) {
        await uploadPlaceCoverPhoto(place.id, coverFile)
      }

      if (rating > 0) {
        const review = await createReview({
          place_id: place.id,
          user_id: user!.id,
          rating,
          text: reviewText || undefined,
        })
        if (reviewPhotoFile && review?.id) {
          await uploadReviewPhoto(review.id, reviewPhotoFile)
        }
      }

      navigate(`/group/${groupId}/place/${place.id}`)
    } catch (err: any) {
      alert(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-svh bg-[#fafaf8] pb-10">
      {/* Header */}
      <div className="sticky top-14 bg-[#fafaf8]/90 backdrop-blur-md z-10 px-5 pt-4 pb-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-gray-700 transition-colors">
            <ChevronLeft size={22} />
          </button>
          <h1 className="text-xl font-semibold text-gray-900">Add a place</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="px-5 flex flex-col gap-5">
        {/* Name with Google Places autocomplete */}
        <div ref={wrapperRef} className="relative">
          <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 block">Place name</label>
          <div className="flex items-center bg-white border border-gray-200 rounded-xl px-3 focus-within:border-violet-300 transition-colors">
            {!isManualMode && <Search size={15} className="text-gray-300 shrink-0" />}
            <input
              type="text"
              placeholder={isManualMode ? 'Place name…' : 'Search on Google Maps…'}
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              onFocus={() => !isManualMode && suggestions.length > 0 && setShowSuggestions(true)}
              required
              className="flex-1 px-3 py-3 text-sm outline-none bg-transparent placeholder:text-gray-300"
            />
            {searching && (
              <div className="w-3.5 h-3.5 rounded-full border-2 border-violet-200 border-t-violet-500 animate-spin shrink-0" />
            )}
          </div>

          {/* Confirmed place badge */}
          <AnimatePresence>
            {linkedPlaceId && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="mt-1.5 flex items-center gap-1.5 text-xs text-emerald-600 font-medium"
              >
                <Check size={12} className="shrink-0" />
                <span>Linked to Google Maps</span>
                <button type="button" onClick={clearLink} className="ml-auto text-gray-300 hover:text-gray-500">
                  <X size={12} />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Not found prompt */}
          <AnimatePresence>
            {!isManualMode && !linkedPlaceId && name.length >= 2 && !searching && (
              <motion.button
                type="button"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={enterManualMode}
                className="mt-1.5 text-xs text-violet-500 font-medium hover:text-violet-700 transition-colors"
              >
                Not found on Google Maps? Add manually →
              </motion.button>
            )}
          </AnimatePresence>

          {/* Suggestions dropdown */}
          <AnimatePresence>
            {showSuggestions && !isManualMode && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-100 rounded-2xl shadow-lg z-50 overflow-hidden"
              >
                {suggestions.map((item) => (
                  <button
                    key={item.placeId}
                    type="button"
                    onClick={() => selectSuggestion(item)}
                    className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0"
                  >
                    <MapPin size={14} className="text-violet-400 mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{item.mainText}</p>
                      {item.secondaryText && <p className="text-xs text-gray-400 truncate">{item.secondaryText}</p>}
                    </div>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Manual mode: address + links */}
        <AnimatePresence>
          {isManualMode && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden flex flex-col gap-3"
            >
              <div className="flex items-center gap-2 text-xs text-violet-500 font-medium bg-violet-50 rounded-xl px-3 py-2">
                <Check size={12} className="shrink-0" />
                <span>Manual mode — Google Maps search skipped</span>
                <button type="button" onClick={() => setIsManualMode(false)} className="ml-auto text-gray-400 hover:text-gray-600">
                  <X size={12} />
                </button>
              </div>
              <div className="flex items-center bg-white border border-gray-200 rounded-xl px-3 focus-within:border-violet-300 transition-colors">
                <MapPin size={15} className="text-gray-300 shrink-0" />
                <input
                  type="text"
                  placeholder="Address (optional)"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="flex-1 px-3 py-3 text-sm outline-none bg-transparent placeholder:text-gray-300"
                />
              </div>
              <div className="flex items-center bg-white border border-gray-200 rounded-xl px-3 focus-within:border-violet-300 transition-colors">
                <Link size={15} className="text-gray-300 shrink-0" />
                <input
                  type="url"
                  placeholder="Google Maps URL (optional)"
                  value={mapsUrl}
                  onChange={(e) => setMapsUrl(e.target.value)}
                  className="flex-1 px-3 py-3 text-sm outline-none bg-transparent placeholder:text-gray-300"
                />
              </div>
              <div className="flex items-center bg-white border border-gray-200 rounded-xl px-3 focus-within:border-violet-300 transition-colors">
                <span className="text-gray-300 text-sm shrink-0">@</span>
                <input
                  type="url"
                  placeholder="Instagram URL (optional)"
                  value={instagramUrl}
                  onChange={(e) => setInstagramUrl(e.target.value)}
                  className="flex-1 px-3 py-3 text-sm outline-none bg-transparent placeholder:text-gray-300"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

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

        {/* Cover photo */}
        <div>
          <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 block">Cover photo</label>
          <div className="relative w-full h-28 rounded-xl overflow-hidden bg-white border border-gray-200 border-dashed flex items-center justify-center">
            {coverPreview ? (
              <>
                <img src={coverPreview} alt="cover" className="w-full h-full object-cover" />
                {!coverFile && googlePhotoUrl && (
                  <span className="absolute bottom-2 left-2 text-[10px] font-medium bg-black/50 text-white px-1.5 py-0.5 rounded-full">
                    Google Maps
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setCoverFile(null)
                    // If this was a manually uploaded photo, fall back to Google photo (or clear)
                    setCoverPreview(googlePhotoUrl ?? null)
                  }}
                  className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/40 flex items-center justify-center text-white"
                >
                  <X size={14} />
                </button>
              </>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <ImagePlus size={22} className="text-gray-300" />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => galleryInputRef.current?.click()}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-gray-100 text-gray-500 hover:bg-violet-50 hover:text-violet-500 transition-colors"
                  >
                    <ImagePlus size={13} /> Gallery
                  </button>
                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-gray-100 text-gray-500 hover:bg-violet-50 hover:text-violet-500 transition-colors"
                  >
                    <Camera size={13} /> Camera
                  </button>
                </div>
              </div>
            )}
          </div>
          <input
            ref={galleryInputRef}
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
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (!file) return
              setCoverFile(file)
              setCoverPreview(URL.createObjectURL(file))
            }}
          />
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

          {/* Review photo */}
          <div className="mt-3">
            {reviewPhotoPreview ? (
              <div className="relative w-full h-28 rounded-xl overflow-hidden">
                <img src={reviewPhotoPreview} alt="review" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => { setReviewPhotoFile(null); setReviewPhotoPreview(null) }}
                  className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/40 flex items-center justify-center text-white"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => reviewPhotoRef.current?.click()}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-gray-100 text-gray-500 hover:bg-violet-50 hover:text-violet-500 transition-colors"
                >
                  <ImagePlus size={13} /> Add photo
                </button>
                <button
                  type="button"
                  onClick={() => reviewCameraRef.current?.click()}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-gray-100 text-gray-500 hover:bg-violet-50 hover:text-violet-500 transition-colors"
                >
                  <Camera size={13} /> Camera
                </button>
              </div>
            )}
            <input
              ref={reviewPhotoRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (!file) return
                setReviewPhotoFile(file)
                setReviewPhotoPreview(URL.createObjectURL(file))
              }}
            />
            <input
              ref={reviewCameraRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (!file) return
                setReviewPhotoFile(file)
                setReviewPhotoPreview(URL.createObjectURL(file))
              }}
            />
          </div>
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
