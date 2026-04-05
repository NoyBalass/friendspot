import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ChevronLeft, MapPin, Globe, ExternalLink } from 'lucide-react'
import { createPlace, createReview } from '../lib/places'
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

export function AddPlacePage() {
  const { groupId } = useParams<{ groupId: string }>()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [groupType, setGroupType] = useState<GroupType>('all')

  useEffect(() => {
    if (groupId) getGroupById(groupId).then(g => setGroupType(g.type ?? 'all')).catch(() => {})
  }, [groupId])

  const availableCategories = groupType === 'all'
    ? CATEGORIES
    : CATEGORIES.filter(c => c.value === groupType)

  const [name, setName] = useState('')
  const [category, setCategory] = useState<Category>('restaurant')
  const [cuisine, setCuisine] = useState('')
  const [mapsSearch, setMapsSearch] = useState('')
  const [instagram, setInstagram] = useState('')
  const [wolt, setWolt] = useState('')
  const [tabit, setTabit] = useState('')
  const [website, setWebsite] = useState('')
  const [rating, setRating] = useState(0)
  const [reviewText, setReviewText] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const place = await createPlace({
        group_id: groupId!,
        name,
        category,
        cuisine: cuisine || undefined,
        google_maps_url: mapsSearch ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapsSearch)}` : undefined,
        instagram_url: instagram || undefined,
        wolt_url: wolt || undefined,
        tabit_url: tabit || undefined,
        website_url: website || undefined,
        added_by: user!.id,
      })

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
        {/* Name */}
        <div>
          <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 block">Place name</label>
          <input
            type="text"
            placeholder="e.g. The Alchemist"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-violet-300 bg-white placeholder:text-gray-300"
          />
        </div>

        {/* Category */}
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
            <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl px-3">
              <MapPin size={15} className="text-blue-400 shrink-0" />
              <input
                type="text"
                placeholder='Search on Google Maps (e.g. "Café Ravel Tel Aviv")'
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
