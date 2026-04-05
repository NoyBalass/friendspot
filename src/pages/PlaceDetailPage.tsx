import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, MapPin, Globe, ExternalLink, Phone, Plus, Pencil, X, Camera, Settings, ImagePlus } from 'lucide-react'
import { getPlaceById, getPlaceReviews, upsertReview, uploadReviewPhoto, getUserReviewForPlace, updatePlace, uploadPlaceCoverPhoto } from '../lib/places'
import { StarRating } from '../components/StarRating'
import { ReviewCard } from '../components/ReviewCard'
import { CategoryBadge } from '../components/CategoryBadge'
import { useAuthStore } from '../store/useAuthStore'
import type { Place, Review } from '../types'

function DancingDots() {
  return (
    <span className="flex items-center justify-center gap-1">
      {[0, 1, 2].map((i) => (
        <motion.span key={i} className="w-1.5 h-1.5 rounded-full bg-white inline-block"
          animate={{ y: [0, -5, 0] }}
          transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.12 }} />
      ))}
    </span>
  )
}

export function PlaceDetailPage() {
  const { groupId, placeId } = useParams<{ groupId: string; placeId: string }>()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [place, setPlace] = useState<Place | null>(null)
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [showReview, setShowReview] = useState(false)
  const [existingReviewId, setExistingReviewId] = useState<string | null>(null)
  const [rating, setRating] = useState(0)
  const [text, setText] = useState('')
  const [photos, setPhotos] = useState<File[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [editName, setEditName] = useState('')
  const [editCuisine, setEditCuisine] = useState('')
  const [editMaps, setEditMaps] = useState('')
  const [editSaving, setEditSaving] = useState(false)
  const [editCoverFile, setEditCoverFile] = useState<File | null>(null)
  const [editCoverPreview, setEditCoverPreview] = useState<string | null>(null)
  // Google Places auto-fetched links
  const [googleLinks, setGoogleLinks] = useState<{ website?: string; instagram?: string; phone?: string } | null>(null)

  useEffect(() => {
    if (placeId && user) load()
  }, [placeId, user])

  async function load() {
    setLoading(true)
    try {
      const [p, r, existing] = await Promise.all([
        getPlaceById(placeId!),
        getPlaceReviews(placeId!),
        getUserReviewForPlace(placeId!, user!.id),
      ])
      setPlace(p)
      setReviews(r)
      if (existing) {
        setExistingReviewId(existing.id)
        setRating(existing.rating ?? 0)
        setText(existing.text ?? '')
      }
      if (p?.google_maps_url) fetchGoogleLinks(p.google_maps_url)
    } finally {
      setLoading(false)
    }
  }

  const avgRating = reviews.length
    ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
    : null

  function openEditSheet() {
    if (!place) return
    const mapsQ = place.google_maps_url
      ? (() => { try { return new URL(place.google_maps_url!).searchParams.get('query') ?? '' } catch { return place.google_maps_url ?? '' } })()
      : ''
    setEditName(place.name)
    setEditCuisine(place.cuisine ?? '')
    setEditMaps(mapsQ)
    setEditCoverFile(null)
    setEditCoverPreview(place.cover_photo ?? null)
    setShowEdit(true)
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault()
    setEditSaving(true)
    try {
      if (editCoverFile) {
        await uploadPlaceCoverPhoto(placeId!, editCoverFile)
      }
      await updatePlace(placeId!, {
        name: editName,
        cuisine: editCuisine || undefined,
        google_maps_url: editMaps ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(editMaps)}` : undefined,
      })
      setShowEdit(false)
      load()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setEditSaving(false)
    }
  }

  async function fetchGoogleLinks(mapsUrl: string) {
    const apiKey = import.meta.env.VITE_GOOGLE_PLACES_API_KEY
    if (!apiKey) return
    try {
      const query = new URL(mapsUrl).searchParams.get('query')
      if (!query) return
      const searchRes = await fetch(
        `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(query)}&inputtype=textquery&fields=place_id&key=${apiKey}`
      )
      const searchData = await searchRes.json()
      const placeId = searchData.candidates?.[0]?.place_id
      if (!placeId) return
      const detailRes = await fetch(
        `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=website,formatted_phone_number&key=${apiKey}`
      )
      const detailData = await detailRes.json()
      const result = detailData.result ?? {}
      const website = result.website as string | undefined
      const phone = result.formatted_phone_number as string | undefined
      const instagram = website?.includes('instagram.com') ? website : undefined
      setGoogleLinks({
        website: instagram ? undefined : website,
        instagram,
        phone,
      })
    } catch {}
  }

  function handleCoverFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setEditCoverFile(file)
    setEditCoverPreview(URL.createObjectURL(file))
  }

  function openReviewSheet() {
    setShowReview(true)
  }

  async function submitReview(e: React.FormEvent) {
    e.preventDefault()
    if (!rating) return
    setSubmitting(true)
    try {
      const review = await upsertReview({
        place_id: placeId!,
        user_id: user!.id,
        rating,
        text: text || undefined,
      })
      await Promise.all(photos.map((f) => uploadReviewPhoto(review.id, f)))
      setShowReview(false)
      setPhotos([])
      load()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading && !place) {
    return (
      <div className="min-h-svh bg-[#fafaf8] pb-28 animate-pulse">
        <div className="h-28 bg-gray-200" />
        <div className="px-5 mt-3">
          <div className="bg-white rounded-3xl p-5 space-y-3">
            <div className="h-5 bg-gray-100 rounded-full w-2/3" />
            <div className="h-3 bg-gray-100 rounded-full w-1/3" />
            <div className="h-4 bg-gray-100 rounded-full w-1/2 mt-2" />
          </div>
          <div className="mt-4 space-y-3">
            {[1,2].map(i => (
              <div key={i} className="bg-white rounded-2xl p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gray-100" />
                  <div className="h-3 bg-gray-100 rounded-full w-24" />
                </div>
                <div className="h-3 bg-gray-100 rounded-full w-full" />
                <div className="h-3 bg-gray-100 rounded-full w-3/4" />
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!place) return null

  // Build Google Maps embed URL from stored search URL
  const mapsQuery = place.google_maps_url
    ? new URL(place.google_maps_url).searchParams.get('query')
    : null

  return (
    <div className="min-h-svh bg-[#fafaf8] pb-28">
      {/* Cover */}
      <div className="relative h-28 bg-gray-100 overflow-hidden">
        {place.cover_photo ? (
          <img src={place.cover_photo} alt={place.name} className="w-full h-full object-cover" />
        ) : mapsQuery ? (
          <iframe
            title="map"
            className="w-full h-full border-0 pointer-events-none"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            src={`https://www.google.com/maps?q=${encodeURIComponent(mapsQuery)}&output=embed`}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-5xl opacity-20">
            {place.category === 'bar' ? '🍸' : place.category === 'restaurant' ? '🍽' : '☕'}
          </div>
        )}

        <button
          onClick={() => navigate(`/group/${groupId}`)}
          className="absolute top-12 left-4 w-9 h-9 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center shadow-sm"
        >
          <ChevronLeft size={20} className="text-gray-700" />
        </button>
      </div>

      {/* Content */}
      <div className="px-5 mt-3">
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-50">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-semibold text-gray-900 leading-tight">{place.name}</h1>
              {place.cuisine && <p className="text-sm text-gray-400 mt-0.5">{place.cuisine}</p>}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {place.added_by === user?.id && (
                <button onClick={openEditSheet} className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 hover:text-violet-500 transition-colors">
                  <Settings size={15} />
                </button>
              )}
              <CategoryBadge category={place.category} small />
            </div>
          </div>

          {avgRating != null && (
            <div className="flex items-center gap-2 mt-3">
              <StarRating value={avgRating} readonly size="md" />
              <span className="text-sm font-medium text-gray-700">{avgRating.toFixed(1)}</span>
              <span className="text-sm text-gray-400">({reviews.length} {reviews.length === 1 ? 'review' : 'reviews'})</span>
            </div>
          )}

          <div className="flex flex-wrap gap-2 mt-4">
            {place.google_maps_url && (
              <a href={place.google_maps_url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-blue-50 text-blue-600 font-medium">
                <MapPin size={12} /> Maps
              </a>
            )}
            {googleLinks?.website && (
              <a href={googleLinks.website} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-gray-50 text-gray-600 font-medium">
                <Globe size={12} /> Website
              </a>
            )}
            {googleLinks?.instagram && (
              <a href={googleLinks.instagram} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-pink-50 text-pink-600 font-medium">
                <ExternalLink size={12} /> Instagram
              </a>
            )}
            {googleLinks?.phone && (
              <a href={`tel:${googleLinks.phone}`}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-600 font-medium">
                <Phone size={12} /> {googleLinks.phone}
              </a>
            )}
          </div>
        </div>

        {/* Add / Edit review — always visible */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={openReviewSheet}
          className="w-full mt-4 py-3 rounded-2xl border-2 border-dashed border-violet-200 text-violet-500 text-sm font-medium flex items-center justify-center gap-2 hover:bg-violet-50 transition-colors"
        >
          {existingReviewId ? <><Pencil size={15} /> Edit your review</> : <><Plus size={15} /> Add your review</>}
        </motion.button>

        {/* Reviews */}
        <div className="mt-5">
          <h2 className="text-base font-semibold text-gray-800 mb-3">
            {reviews.length > 0 ? `${reviews.length} ${reviews.length === 1 ? 'review' : 'reviews'}` : 'No reviews yet'}
          </h2>
          <div className="flex flex-col gap-3">
            {reviews.map((review, i) => (
              <ReviewCard
                key={review.id}
                review={review}
                index={i}
                currentUserId={user?.id}
                onPhotoAdded={load}
                onDeleted={load}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Edit place sheet */}
      <AnimatePresence>
        {showEdit && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center px-5"
            onClick={() => setShowEdit(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: 'spring', damping: 30, stiffness: 400 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg bg-white rounded-3xl p-6 shadow-xl max-h-[85svh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-semibold text-gray-900">Edit place</h2>
                <button onClick={() => setShowEdit(false)} className="text-gray-400"><X size={20} /></button>
              </div>

              <form onSubmit={saveEdit} className="flex flex-col gap-4">
                {/* Cover photo */}
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Cover photo</p>
                  <label className="relative block cursor-pointer group">
                    <div className="w-full h-28 rounded-xl overflow-hidden bg-gray-50 border border-gray-200 border-dashed flex items-center justify-center">
                      {editCoverPreview ? (
                        <img src={editCoverPreview} alt="cover" className="w-full h-full object-cover" />
                      ) : (
                        <div className="flex flex-col items-center gap-1 text-gray-300 group-hover:text-violet-400 transition-colors">
                          <ImagePlus size={22} />
                          <span className="text-xs">Upload cover photo</span>
                        </div>
                      )}
                      {editCoverPreview && (
                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-xl">
                          <ImagePlus size={20} className="text-white" />
                        </div>
                      )}
                    </div>
                    <input type="file" accept="image/*" onChange={handleCoverFileChange} className="hidden" />
                  </label>
                  <p className="text-xs text-gray-300 mt-1.5">If left empty, the Google Maps location will be shown instead</p>
                </div>

                <input
                  type="text"
                  placeholder="Place name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-violet-300 bg-gray-50 placeholder:text-gray-300"
                />
                <input
                  type="text"
                  placeholder="Cuisine / type"
                  value={editCuisine}
                  onChange={(e) => setEditCuisine(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-violet-300 bg-gray-50 placeholder:text-gray-300"
                />
                <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-xl px-3">
                  <MapPin size={15} className="text-blue-400 shrink-0" />
                  <input
                    type="text"
                    placeholder="Google Maps search"
                    value={editMaps}
                    onChange={(e) => setEditMaps(e.target.value)}
                    className="flex-1 py-3 text-sm outline-none bg-transparent placeholder:text-gray-300"
                  />
                </div>
                <button
                  type="submit"
                  disabled={editSaving}
                  className="py-3 rounded-xl bg-violet-500 text-white text-sm font-semibold hover:bg-violet-600 active:scale-95 transition-all disabled:opacity-40"
                >
                  {editSaving ? <DancingDots /> : 'Save changes'}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Review sheet */}
      <AnimatePresence>
        {showReview && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center px-5"
            onClick={() => setShowReview(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: 'spring', damping: 30, stiffness: 400 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg bg-white rounded-3xl p-6 shadow-xl"
            >
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-semibold text-gray-900">
                  {existingReviewId ? 'Edit your review' : 'Your review'}
                </h2>
                <button onClick={() => setShowReview(false)} className="text-gray-400">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={submitReview} className="flex flex-col gap-4">
                <div>
                  <p className="text-sm text-gray-500 mb-2">Rating</p>
                  <StarRating value={rating} onChange={setRating} size="lg" />
                </div>

                <textarea
                  placeholder="Share your thoughts... (optional)"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-violet-300 bg-gray-50 placeholder:text-gray-300 resize-none"
                />

                <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer hover:text-violet-500 transition-colors">
                  <Camera size={16} />
                  {photos.length > 0 ? `${photos.length} photo${photos.length > 1 ? 's' : ''} selected` : 'Add photos'}
                  <input type="file" accept="image/*" multiple onChange={(e) => setPhotos(e.target.files ? Array.from(e.target.files) : [])} className="hidden" />
                </label>

                <button
                  type="submit"
                  disabled={!rating || submitting}
                  className="py-3 rounded-xl bg-violet-500 text-white text-sm font-semibold hover:bg-violet-600 active:scale-95 transition-all disabled:opacity-40"
                >
                  {submitting ? <DancingDots /> : existingReviewId ? 'Save changes' : 'Post review'}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
