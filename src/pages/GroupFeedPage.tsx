import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ChevronLeft, Plus, Search } from 'lucide-react'
import { getGroupById } from '../lib/groups'
import { getGroupPlaces } from '../lib/places'
import { PlaceCard } from '../components/PlaceCard'
import { useAuthStore } from '../store/useAuthStore'
import type { Place, Category } from '../types'

const CATEGORIES: { value: Category | 'all'; label: string }[] = [
  { value: 'all', label: '✨ All' },
  { value: 'restaurant', label: '🍽 Restaurant' },
  { value: 'bar', label: '🍸 Bar' },
  { value: 'coffee', label: '☕ Coffee' },
  { value: 'other', label: '📍 Other' },
]

export function GroupFeedPage() {
  const { groupId } = useParams<{ groupId: string }>()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [group, setGroup] = useState<any>(null)
  const [places, setPlaces] = useState<Place[]>([])
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState<Category | 'all'>('all')
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (groupId) {
      loadGroup()
      loadPlaces(places.length === 0)
    }
  }, [groupId])

  useEffect(() => {
    loadPlaces(true)
  }, [category])

  useEffect(() => {
    loadPlaces(false)
  }, [search])

  async function loadGroup() {
    try {
      const data = await getGroupById(groupId!)
      setGroup(data)
    } catch {}
  }

  async function loadPlaces(showSpinner = false) {
    if (showSpinner) setLoading(true)
    try {
      const data = await getGroupPlaces(
        groupId!,
        category === 'all' ? undefined : category,
        search || undefined
      )
      setPlaces(data)
    } finally {
      setLoading(false)
    }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
  }

  return (
    <div className="min-h-svh bg-[#fafaf8] pb-28">
      {/* Header */}
      <div className="sticky top-0 bg-[#fafaf8]/90 backdrop-blur-md z-10 px-5 pt-12 pb-3">
        <div className="flex items-center gap-3 mb-3">
          <button onClick={() => navigate('/')} className="text-gray-400 hover:text-gray-700 transition-colors">
            <ChevronLeft size={22} />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-semibold text-gray-900 truncate">{group?.name ?? '...'}</h1>
          </div>
        </div>

        {/* Search */}
        <form onSubmit={handleSearch} className="flex items-center gap-2 bg-white border border-gray-100 rounded-xl px-3 py-2.5 shadow-sm">
          <Search size={15} className="text-gray-300 shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search places..."
            className="flex-1 text-sm outline-none bg-transparent placeholder:text-gray-300"
          />
        </form>

        {/* Category filter */}
        <div className="flex gap-2 mt-3 overflow-x-auto pb-1 scrollbar-hide">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setCategory(cat.value)}
              className={`whitespace-nowrap text-xs px-3 py-1.5 rounded-full border transition-all font-medium ${
                category === cat.value
                  ? 'bg-violet-500 border-violet-500 text-white'
                  : 'bg-white border-gray-100 text-gray-500'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Places grid */}
      <div className="px-5 mt-2">
        {loading ? (
          <div className="flex justify-center pt-16">
            <div className="w-6 h-6 rounded-full border-2 border-violet-200 border-t-violet-500 animate-spin" />
          </div>
        ) : places.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center pt-16 text-gray-400"
          >
            <div className="text-4xl mb-3">🗺</div>
            <p className="text-sm">No places yet. Be the first to add one!</p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {places.map((place) => (
              <PlaceCard key={place.id} place={place} groupId={groupId!} currentUserId={user?.id} onDeleted={() => loadPlaces(false)} />
            ))}
          </div>
        )}
      </div>

      {/* Add button */}
      <motion.button
        whileTap={{ scale: 0.92 }}
        onClick={() => navigate(`/group/${groupId}/add`)}
        className="fixed bottom-20 right-5 w-14 h-14 rounded-full bg-violet-500 text-white shadow-lg shadow-violet-200 flex items-center justify-center hover:bg-violet-600 transition-colors z-40"
      >
        <Plus size={24} />
      </motion.button>
    </div>
  )
}
